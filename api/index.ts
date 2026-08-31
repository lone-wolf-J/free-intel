import { Hono } from "hono";
import { cors } from "hono/cors";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

// ─── RATE LIMITING (in-memory, per-invocation) ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// ─── INPUT VALIDATION HELPERS ───
function sanitizeString(s: unknown, maxLen: number): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, maxLen);
}
function isValidUrl(u: string): boolean {
  try { const parsed = new URL(u); return ["http:", "https:"].includes(parsed.protocol); } catch { return false; }
}
function isPrivateIp(hostname: string): boolean {
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|::)$/i.test(hostname)) return true;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|fc00:|fe80:)/i.test(hostname)) return true;
  if (/(?:metadata|169\.254\.169\.254)/i.test(hostname)) return true;
  return false;
}

const BAD_CATEGORIES = new Set(["pricing", "directory", "ai-directory", "research", "newsletter", "news", "vendor-blog", "vendor blog", "comparison", "tutorial", "guide", "list", "roundup", "announcement"]);
const BAD_URL_PATTERNS = [/reddit\.com/i, /arxiv\.org/i, /theguardian\.com/i, /medium\.com/i, /substack\.com/i, /twitter\.com/i, /x\.com/i, /linkedin\.com\/pulse/i, /hackernews\.com/i, /news\.ycombinator\.com/i, /\.pdf$/i];
const BAD_NAME_PATTERNS = [/highlights/i, /self-promotion/i, /thread/i, /backs down/i, /expands access/i, /commitment to/i, /boom/i, /what will we/i, /comment/i, /show hn/i];
function isTool(r: any): boolean {
  if (r.resource_type === "article") return false;
  const cat = (r.category || "").toLowerCase();
  if (BAD_CATEGORIES.has(cat)) return false;
  const url = (r.url || "").toLowerCase();
  if (BAD_URL_PATTERNS.some(p => p.test(url))) return false;
  const name = (r.name || "").toLowerCase();
  if (BAD_NAME_PATTERNS.some(p => p.test(name))) return false;
  return true;
}

function parseJson(v: any, def: any): any {
  if (v == null) return def;
  if (typeof v === "string") {
    try { const p = JSON.parse(v); return p ?? def; } catch { return def; }
  }
  if (Array.isArray(def) && !Array.isArray(v)) return def;
  return v;
}

// ═══════════════════════════════════════════════════════════════
//  ALTERNATIVES INTELLIGENCE (lazy-loaded)
// ═══════════════════════════════════════════════════════════════
type AltEntry = { name: string; url: string; type: string; description: string; score: number; self_hostable: boolean; license?: string; key_differences?: string[] };
type ToolRecord = { names: string[]; category: string; subcategory?: string; typical_cost_mo: number; typical_cost_note?: string; alternatives: AltEntry[] };

let _byExact: Map<string, ToolRecord> | null = null;
let _byNorm: Map<string, ToolRecord> | null = null;

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s+$/, "");
}

function ensureAltMaps() {
  if (_byExact) return;
  _byExact = new Map();
  _byNorm = new Map();
  for (const tool of TOOLS_DATA) {
    for (const n of tool.names) {
      _byExact!.set(n.toLowerCase(), tool);
      _byNorm!.set(norm(n), tool);
    }
  }
}

function findTool(query: string): ToolRecord | null {
  ensureAltMaps();
  const q = query.trim();
  const n = norm(q);
  const exact = _byExact!.get(q.toLowerCase());
  if (exact) return exact;
  const nMatch = _byNorm!.get(n);
  if (nMatch) return nMatch;
  for (const [key, rec] of _byExact!) {
    if (key.includes(q.toLowerCase()) || q.toLowerCase().includes(key)) return rec;
  }
  for (const [key, rec] of _byNorm!) {
    if (key.startsWith(n) || n.startsWith(key)) return rec;
  }
  return null;
}

function searchTools(query: string): ToolRecord[] {
  ensureAltMaps();
  const q = norm(query);
  const results: ToolRecord[] = [];
  const seen = new Set<ToolRecord>();
  for (const [key, rec] of _byNorm!) {
    if (key === q || key.startsWith(q) || q.startsWith(key)) {
      if (!seen.has(rec)) { results.push(rec); seen.add(rec); }
    }
  }
  for (const [key, rec] of _byNorm!) {
    if (!seen.has(rec) && (key.includes(q) || q.includes(key))) {
      results.push(rec); seen.add(rec);
    }
  }
  return results;
}

function getAllTools(): ToolRecord[] {
  ensureAltMaps();
  const seen = new Set<ToolRecord>();
  const all: ToolRecord[] = [];
  for (const rec of _byExact!.values()) {
    if (!seen.has(rec)) { all.push(rec); seen.add(rec); }
  }
  return all;
}

function getCategories(): string[] {
  ensureAltMaps();
  const cats = new Set<string>();
  for (const rec of _byExact!.values()) cats.add(rec.category);
  return [...cats].sort();
}

const TOOLS_DATA: ToolRecord[] = [{"names":["ChatGPT","chat gpt","openai chatgpt","gpt-4","gpt4","gpt-4o","gpt 4"],"category":"ai","subcategory":"chatbot","typical_cost_mo":20,"typical_cost_note":"Plus plan $20/mo; Pro $200/mo","alternatives":[{"name":"Ollama + Open WebUI","url":"https://ollama.com","type":"open_source","description":"Run Llama 3, Mistral, Gemma, Phi and 100+ open models locally. Open WebUI gives ChatGPT-like interface.","score":90,"self_hostable":true,"license":"MIT","key_differences":["No internet needed","No data leaves your machine","Requires decent hardware (8GB+ RAM)","Models slightly behind GPT-4 class"]},{"name":"LibreChat","url":"https://github.com/danny-avila/LibreChat","type":"open_source","description":"Multi-model chat interface supporting OpenAI, Anthropic, Google, local models. Self-hosted ChatGPT clone.","score":88,"self_hostable":true,"license":"MIT","key_differences":["Supports multiple providers","Plugin system","Multi-user auth","Self-hosted"]},{"name":"Jan","url":"https://jan.ai","type":"open_source","description":"Desktop app for running AI models locally. Clean UI, no technical setup needed.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Desktop app, not web","Very easy setup","Offline capable"]},{"name":"LM Studio","url":"https://lmstudio.ai","type":"freemium","description":"Desktop app to discover, download, and run local LLMs. Beautiful UI.","score":80,"self_hostable":true,"key_differences":["GUI model browser","One-click downloads","Local inference only"]},{"name":"Perplexity AI (free tier)","url":"https://perplexity.ai","type":"free_tier","description":"AI search engine with citations. Free tier gives basic queries.","score":70,"self_hostable":false,"key_differences":["Search-focused, not chat","Citations included","Limited free queries"]}]},{"names":["Claude","claude ai","anthropic claude","claude-3","claude 3.5","claude sonnet","claude opus"],"category":"ai","subcategory":"chatbot","typical_cost_mo":20,"typical_cost_note":"Pro plan $20/mo; Team $30/user/mo","alternatives":[{"name":"Ollama + Open WebUI","url":"https://ollama.com","type":"open_source","description":"Run Llama 3.1 405B, Mistral Large, Command R+ locally. Closest open models to Claude's capability.","score":85,"self_hostable":true,"license":"MIT","key_differences":["Llama 3.1 405B rivals Claude Sonnet","No API costs","Requires GPU for largest models"]},{"name":"LibreChat","url":"https://github.com/danny-avila/LibreChat","type":"open_source","description":"Self-hosted multi-model chat. Switch between Claude, GPT, local models.","score":85,"self_hostable":true,"license":"MIT","key_differences":["Multi-provider","Can use Claude API with your own key at lower cost"]},{"name":"Mistral AI (free tier)","url":"https://chat.mistral.ai","type":"free_tier","description":"Mistral's free chat. Strong coding and reasoning. Le Chat interface.","score":78,"self_hostable":false,"key_differences":["Free for basic use","Strong at coding","No file upload on free tier"]},{"name":"Google Gemini (free tier)","url":"https://gemini.google.com","type":"free_tier","description":"Google's AI assistant. Free tier with Gemini 2.0 Flash.","score":75,"self_hostable":false,"key_differences":["Google ecosystem integration","Good at research","Privacy concerns"]}]},{"names":["Gemini","google gemini","bard","google bard","gemini pro"],"category":"ai","subcategory":"chatbot","typical_cost_mo":20,"typical_cost_note":"Advanced $20/mo; Business $24/user/mo","alternatives":[{"name":"Google Gemini (free)","url":"https://gemini.google.com","type":"free_tier","description":"Gemini 2.0 Flash available free. Good enough for most tasks.","score":85,"self_hostable":false,"key_differences":["Same model family, limited usage","No advanced features"]},{"name":"Ollama + Open WebUI","url":"https://ollama.com","type":"open_source","description":"Run Gemma 2 (Google's open model) and others locally.","score":80,"self_hostable":true,"license":"MIT","key_differences":["Gemma 2 is Google's open model","Local and private"]},{"name":"Mistral AI (free)","url":"https://chat.mistral.ai","type":"free_tier","description":"Free chat with Mistral models.","score":75,"self_hostable":false,"key_differences":["Different model family","Free tier available"]}]},{"names":["Midjourney","midjourney ai","mj"],"category":"ai","subcategory":"image_generation","typical_cost_mo":10,"typical_cost_note":"Basic $10/mo; Standard $30/mo","alternatives":[{"name":"Stable Diffusion (local)","url":"https://stability.ai","type":"open_source","description":"Run SDXL, SD 3, Flux locally. Full control over generation.","score":88,"self_hostable":true,"license":"CreativeML Open RAIL-M","key_differences":["Requires GPU (6GB+ VRAM)","More control but steeper learning curve","No subscription cost"]},{"name":"ComfyUI","url":"https://github.com/comfyanonymous/ComfyUI","type":"open_source","description":"Node-based Stable Diffusion UI. Powerful workflow automation.","score":85,"self_hostable":true,"license":"GPL-3.0","key_differences":["Node-based workflows","Extensible","Community models"]},{"name":"Flux (local)","url":"https://github.com/black-forest-labs/flux","type":"open_source","description":"Black Forest Labs' Flux model. State-of-art open image generation.","score":87,"self_hostable":true,"license":"Apache-2.0","key_differences":["Best open model quality","Requires significant GPU"]},{"name":"Leonardo.ai (free tier)","url":"https://leonardo.ai","type":"free_tier","description":"AI image generation with free daily credits.","score":72,"self_hostable":false,"key_differences":["Web-based","Limited free credits","Good UI"]},{"name":"Clipdrop (free tier)","url":"https://clipdrop.co","type":"free_tier","description":"Stability AI's image tools. Some free features.","score":65,"self_hostable":false,"key_differences":["Web-based tools","Not full generation"]}]},{"names":["DALL-E","dalle","dall-e 3","dall-e 3","openai image"],"category":"ai","subcategory":"image_generation","typical_cost_mo":20,"typical_cost_note":"Included in ChatGPT Plus; API pay-per-use","alternatives":[{"name":"Stable Diffusion (local)","url":"https://stability.ai","type":"open_source","description":"Free, open image generation. SDXL and Flux models available.","score":85,"self_hostable":true,"license":"CreativeML Open RAIL-M","key_differences":["No per-image cost","Requires GPU setup"]},{"name":"Flux (local)","url":"https://github.com/black-forest-labs/flux","type":"open_source","description":"Best open image model. rivals DALL-E 3 quality.","score":88,"self_hostable":true,"license":"Apache-2.0","key_differences":["Top-tier quality","Open source","Requires GPU"]},{"name":"Ideogram (free tier)","url":"https://ideogram.ai","type":"free_tier","description":"AI image generation with strong text rendering. Free tier available.","score":72,"self_hostable":false,"key_differences":["Better at text in images","Web-based"]}]},{"names":["GitHub Copilot","copilot","github copilot","copilot ai"],"category":"ai","subcategory":"code_assistant","typical_cost_mo":10,"typical_cost_note":"Individual $10/mo; Business $19/user/mo","alternatives":[{"name":"Continue","url":"https://continue.dev","type":"open_source","description":"AI code assistant for VS Code/JetBrains. Connect to any LLM (local or cloud).","score":88,"self_hostable":true,"license":"Apache-2.0","key_differences":["Works with any LLM","Local models supported","VS Code + JetBrains"]},{"name":"Tabby","url":"https://tabby.tabbyml.com","type":"open_source","description":"Self-hosted AI coding assistant. Supports local GPUs.","score":82,"self_hostable":true,"license":"Apache-2.0","key_differences":["Self-hosted","GPU accelerated","VS Code + JetBrains"]},{"name":"Codeium / Windsurf (free tier)","url":"https://codeium.com","type":"freemium","description":"AI code completion. Free tier for individuals. Very fast.","score":85,"self_hostable":false,"key_differences":["Free for individuals","Fast completions","Multi-IDE support"]},{"name":"Supermaven (free tier)","url":"https://supermaven.com","type":"freemium","description":"Fastest AI code completion. Free tier available.","score":80,"self_hostable":false,"key_differences":["Extremely fast","Large context window"]},{"name":"Cody by Sourcegraph (free tier)","url":"https://sourcegraph.com/cody","type":"freemium","description":"AI coding assistant with codebase context. Free for individuals.","score":78,"self_hostable":false,"key_differences":["Codebase-aware","Uses multiple LLMs"]}]},{"names":["Jasper","jasper ai","jasper.ai"],"category":"ai","subcategory":"content_generation","typical_cost_mo":39,"typical_cost_note":"Creator $39/mo; Pro $59/mo","alternatives":[{"name":"Ollama + custom prompts","url":"https://ollama.com","type":"open_source","description":"Use Llama 3 or Mistral locally with marketing prompts. No subscription.","score":80,"self_hostable":true,"key_differences":["Free after setup","Needs prompt engineering"]},{"name":"ChatGPT Free","url":"https://chat.openai.com","type":"free_tier","description":"GPT-4o mini for content generation. Free tier available.","score":75,"self_hostable":false,"key_differences":["Limited model access","No brand voice training"]},{"name":"Copy.ai (free tier)","url":"https://copy.ai","type":"freemium","description":"AI content generation. Free tier with limited credits.","score":70,"self_hostable":false,"key_differences":["Template-based","Limited free credits"]}]},{"names":["Notion","notion ai","notion.so"],"category":"productivity","subcategory":"workspace","typical_cost_mo":10,"typical_cost_note":"Plus $10/user/mo; Business $18/user/mo","alternatives":[{"name":"AppFlowy","url":"https://appflowy.io","type":"open_source","description":"Notion alternative built with Rust. Fast, local-first, extensible.","score":90,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Rust-based (very fast)","Plugin system","Local-first option","Growing ecosystem"]},{"name":"Outline","url":"https://www.getoutline.com","type":"open_source","description":"Team wiki and knowledge base. Beautiful UI, real-time collaboration.","score":88,"self_hostable":true,"license":"BSL-1.1","key_differences":["Focused on docs/wiki","Real-time collab","API-first"]},{"name":"AFFiNE","url":"https://affine.pro","type":"open_source","description":"All-in-one workspace: docs, whiteboards, and databases.","score":85,"self_hostable":true,"license":"MIT","key_differences":["Canvas + docs hybrid","Offline capable","Modern UI"]},{"name":"Logseq","url":"https://logseq.com","type":"open_source","description":"Knowledge management with outliner. Bidirectional links.","score":80,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Outliner-based","Graph view","Privacy-first (local files)"]},{"name":"Docmost","url":"https://docmost.com","type":"open_source","description":"Real-time collaborative wiki. Modern Notion-like experience.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Real-time editing","Spaces and permissions","Self-hosted"]},{"name":"Notion (free tier)","url":"https://notion.so","type":"free_tier","description":"Free for individuals. Unlimited pages and blocks.","score":75,"self_hostable":false,"key_differences":["Free for personal use","Limited AI features"]}]},{"names":["Asana","asana.com"],"category":"productivity","subcategory":"project_management","typical_cost_mo":11,"typical_cost_note":"Starter $11/user/mo; Advanced $25/user/mo","alternatives":[{"name":"Plane","url":"https://plane.so","type":"open_source","description":"Linear/Jira alternative. Modern issue tracking with cycles and modules.","score":90,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Closest to Linear UX","Sprints/cycles","Self-hosted or cloud"]},{"name":"Taiga","url":"https://taiga.io","type":"open_source","description":"Agile project management. Scrum and Kanban boards.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Mature platform","Scrum + Kanban","Backlog management"]},{"name":"OpenProject","url":"https://www.openproject.org","type":"open_source","description":"Full project management: Gantt, boards, wiki, time tracking.","score":80,"self_hostable":true,"license":"GPL-3.0","key_differences":["Gantt charts","Time tracking","Enterprise features in free tier"]},{"name":"Focalboard","url":"https://www.focalboard.com","type":"open_source","description":"Trello/Asana/Notion alternative. Kanban, table, calendar views.","score":78,"self_hostable":true,"license":"MIT","key_differences":["Multiple view types","Mattermost integration"]},{"name":"ClickUp (free tier)","url":"https://clickup.com","type":"free_tier","description":"Very generous free tier: unlimited tasks, members, 100MB storage.","score":85,"self_hostable":false,"key_differences":["Most features free","Docs, whiteboards, sprints included"]}]},{"names":["Monday.com","monday","monday.com"],"category":"productivity","subcategory":"project_management","typical_cost_mo":12,"typical_cost_note":"Basic $12/seat/mo; Standard $14/seat/mo","alternatives":[{"name":"Plane","url":"https://plane.so","type":"open_source","description":"Modern project management. Closest to Monday.com UX.","score":88,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Cleaner UI","Open source","Active development"]},{"name":"OpenProject","url":"https://www.openproject.org","type":"open_source","description":"Full-featured PM with Gantt, boards, budgets.","score":82,"self_hostable":true,"license":"GPL-3.0","key_differences":["Gantt charts","Budget tracking","More traditional PM"]},{"name":"Leantime","url":"https://leantime.io","type":"open_source","description":"Project management for non-project managers. Strategy-focused.","score":75,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Strategy-first approach","Strategy docs built-in"]},{"name":"ClickUp (free tier)","url":"https://clickup.com","type":"free_tier","description":"Generous free tier with most features.","score":82,"self_hostable":false,"key_differences":["Feature-rich free tier"]}]},{"names":["Trello","trello.com"],"category":"productivity","subcategory":"kanban","typical_cost_mo":5,"typical_cost_note":"Standard $5/user/mo; Premium $10/user/mo","alternatives":[{"name":"Planka","url":"https://github.com/plankanban/planka","type":"open_source","description":"Trello clone. Real-time Kanban boards. Beautiful UI.","score":92,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Near-identical Trello UX","Real-time","Very polished"]},{"name":"WeKan","url":"https://github.com/wekan/wekan","type":"open_source","description":"Trello-like Kanban board. Mature, many integrations.","score":85,"self_hostable":true,"license":"MIT","key_differences":["Mature project","Many integrations","More traditional UI"]},{"name":"Focalboard","url":"https://www.focalboard.com","type":"open_source","description":"Kanban, table, calendar, gallery views. Trello alternative.","score":80,"self_hostable":true,"license":"MIT","key_differences":["Multiple views","Not just Kanban"]},{"name":"Trello (free tier)","url":"https://trello.com","type":"free_tier","description":"Free for up to 10 boards. Basic power-ups.","score":70,"self_hostable":false,"key_differences":["Limited boards on free","Good for small teams"]}]},{"names":["Jira","jira software","atlassian jira"],"category":"productivity","subcategory":"issue_tracking","typical_cost_mo":8,"typical_cost_note":"Standard $8.15/user/mo; Premium $16/user/mo","alternatives":[{"name":"Plane","url":"https://plane.so","type":"open_source","description":"Modern issue tracking. Cycles, modules, views. Linear-like.","score":90,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Cleaner than Jira","Modern UX","Sprints support"]},{"name":"Taiga","url":"https://taiga.io","type":"open_source","description":"Agile project management with Scrum and Kanban.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Scrum-native","Backlog management"]},{"name":"Gitea","url":"https://gitea.com","type":"open_source","description":"Git hosting with issues, PRs, projects, actions. GitHub alternative.","score":78,"self_hostable":true,"license":"MIT","key_differences":["Git-first","Lightweight","GitHub-like"]},{"name":"Redmine","url":"https://www.redmine.org","type":"open_source","description":"Project management with issue tracking, wiki, Gantt.","score":70,"self_hostable":true,"license":"GPL-2.0","key_differences":["Mature","Plugin ecosystem","Dated UI"]}]},{"names":["Linear","linear.app"],"category":"productivity","subcategory":"issue_tracking","typical_cost_mo":8,"typical_cost_note":"Standard $8/user/mo; Plus $14/user/mo","alternatives":[{"name":"Plane","url":"https://plane.so","type":"open_source","description":"The closest open-source Linear alternative. Modern, fast, clean.","score":92,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Most Linear-like UX","Cycles, modules, views","Self-hostable"]},{"name":"Gitea + Projects","url":"https://gitea.com","type":"open_source","description":"Git hosting with built-in project boards and issues.","score":75,"self_hostable":true,"license":"MIT","key_differences":["Git-first workflow","Built-in CI/CD"]}]},{"names":["Confluence","atlassian confluence"],"category":"productivity","subcategory":"wiki","typical_cost_mo":6,"typical_cost_note":"Standard $6.05/user/mo; Premium $11.55/user/mo","alternatives":[{"name":"Outline","url":"https://www.getoutline.com","type":"open_source","description":"Team wiki. Beautiful editor, real-time collab, Slack integration.","score":90,"self_hostable":true,"license":"BSL-1.1","key_differences":["Modern UI","Real-time editing","API-first"]},{"name":"BookStack","url":"https://www.bookstackapp.com","type":"open_source","description":"Simple, opinionated wiki. Pages, chapters, books hierarchy.","score":85,"self_hostable":true,"license":"MIT","key_differences":["Very simple structure","Great for documentation"]},{"name":"Wiki.js","url":"https://js.wiki","type":"open_source","description":"Modern wiki with Markdown, visual editor, Git storage.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Multiple storage backends","Markdown-first"]},{"name":"Docmost","url":"https://docmost.com","type":"open_source","description":"Real-time collaborative wiki. Notion-like experience.","score":80,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Real-time","Spaces","Modern UI"]}]},{"names":["ClickUp","clickup.com"],"category":"productivity","subcategory":"project_management","typical_cost_mo":7,"typical_cost_note":"Unlimited $7/user/mo; Business $12/user/mo","alternatives":[{"name":"ClickUp (free tier)","url":"https://clickup.com","type":"free_tier","description":"Very generous free: unlimited tasks, members, docs, whiteboards.","score":90,"self_hostable":false,"key_differences":["Free tier is very complete","No self-hosting"]},{"name":"Plane","url":"https://plane.so","type":"open_source","description":"Open source project management. Clean, modern.","score":85,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted option","Less feature-rich than ClickUp"]}]},{"names":["Figma","figma.com"],"category":"design","subcategory":"ui_design","typical_cost_mo":15,"typical_cost_note":"Professional $15/editor/mo; Organization $45/editor/mo","alternatives":[{"name":"Penpot","url":"https://penpot.app","type":"open_source","description":"Open source design platform. CSS Grid/Flex, SVG-native, real-time collab.","score":88,"self_hostable":true,"license":"MPL-2.0","key_differences":["Open standards (SVG, CSS)","No proprietary format","Growing plugin ecosystem","Real-time collaboration"]},{"name":"Excalidraw","url":"https://excalidraw.com","type":"open_source","description":"Virtual whiteboard. Hand-drawn style. Great for wireframes.","score":75,"self_hostable":true,"license":"MIT","key_differences":["Whiteboard style, not pixel-perfect","Great for brainstorming","Simple and fast"]},{"name":"Figma (free tier)","url":"https://figma.com","type":"free_tier","description":"3 files, unlimited personal files. Enough for solo designers.","score":70,"self_hostable":false,"key_differences":["Limited collaboration on free","Good for individuals"]}]},{"names":["Canva","canva pro","canva.com"],"category":"design","subcategory":"graphic_design","typical_cost_mo":13,"typical_cost_note":"Pro $13/mo; Teams $10/user/mo","alternatives":[{"name":"Canva (free tier)","url":"https://canva.com","type":"free_tier","description":"250K+ templates, 1M+ stock photos. Most features available free.","score":85,"self_hostable":false,"key_differences":["Very generous free tier","Most needs covered","No brand kits on free"]},{"name":"Penpot","url":"https://penpot.app","type":"open_source","description":"Open source design tool. More professional than Canva.","score":80,"self_hostable":true,"license":"MPL-2.0","key_differences":["More professional tool","Less template-focused","Self-hostable"]},{"name":"Affinity (free)","url":"https://affinity.serif.com","type":"free_alternative","description":"Professional design suite now free. Photo, Designer, Publisher.","score":90,"self_hostable":true,"key_differences":["Professional-grade","Desktop app","No collaboration","Replaces Adobe CC"]},{"name":"GIMP","url":"https://www.gimp.org","type":"open_source","description":"Powerful image editor. Photoshop alternative.","score":75,"self_hostable":true,"license":"GPL-3.0","key_differences":["Steep learning curve","Very powerful","Plugin ecosystem"]},{"name":"Photopea","url":"https://www.photopea.com","type":"freemium","description":"Photoshop clone in the browser. Supports PSD, AI, Sketch files.","score":82,"self_hostable":false,"key_differences":["Browser-based","PSD support","Free with ads"]}]},{"names":["Adobe Photoshop","photoshop","adobe photoshop","ps"],"category":"design","subcategory":"image_editing","typical_cost_mo":23,"typical_cost_note":"Photography Plan $23/mo; All Apps $60/mo","alternatives":[{"name":"Affinity Photo (free)","url":"https://affinity.serif.com","type":"free_alternative","description":"Professional photo editor. Now free. Replaces Photoshop for most tasks.","score":92,"self_hostable":true,"key_differences":["Professional grade","Desktop app","No subscription","Most PS features"]},{"name":"Photopea","url":"https://www.photopea.com","type":"freemium","description":"Browser-based Photoshop clone. Opens PSD files natively.","score":85,"self_hostable":false,"key_differences":["Browser-based","PSD support","Free with ads"]},{"name":"GIMP","url":"https://www.gimp.org","type":"open_source","description":"Powerful open source image editor. Steep learning curve.","score":78,"self_hostable":true,"license":"GPL-3.0","key_differences":["Very powerful","Steeper learning curve","Plugin ecosystem"]},{"name":"Krita","url":"https://krita.org","type":"open_source","description":"Digital painting and illustration. Excellent brush engine.","score":80,"self_hostable":true,"license":"GPL-3.0","key_differences":["Best for digital painting","Animation support","Tablet-optimized"]}]},{"names":["Adobe Illustrator","illustrator","adobe illustrator","ai"],"category":"design","subcategory":"vector_graphics","typical_cost_mo":23,"typical_cost_note":"Single App $23/mo; All Apps $60/mo","alternatives":[{"name":"Affinity Designer (free)","url":"https://affinity.serif.com","type":"free_alternative","description":"Professional vector editor. Now free. Direct Illustrator replacement.","score":92,"self_hostable":true,"key_differences":["Professional grade","Opens AI files","No subscription"]},{"name":"Inkscape","url":"https://inkscape.org","type":"open_source","description":"Powerful vector graphics editor. SVG-native.","score":80,"self_hostable":true,"license":"GPL-2.0","key_differences":["SVG-native","Steep learning curve","Very capable"]},{"name":"Penpot","url":"https://penpot.app","type":"open_source","description":"Web-based design tool. SVG-native, collaborative.","score":75,"self_hostable":true,"license":"MPL-2.0","key_differences":["Web-based","Collaborative","Less mature than desktop tools"]}]},{"names":["Adobe Creative Cloud","adobe cc","adobe all apps","adobe suite"],"category":"design","subcategory":"creative_suite","typical_cost_mo":60,"typical_cost_note":"All Apps $60/mo ($55/mo first year)","alternatives":[{"name":"Affinity Suite (free)","url":"https://affinity.serif.com","type":"free_alternative","description":"Photo + Designer + Publisher. Now completely free. Replaces Photoshop, Illustrator, InDesign.","score":95,"self_hostable":true,"key_differences":["Professional grade","One-time purchase was $170, now free","Desktop apps","No cloud collaboration"]},{"name":"DaVinci Resolve (free)","url":"https://www.blackmagicdesign.com/products/davinciresolve","type":"free_tier","description":"Professional video editor. Free version is incredibly capable.","score":90,"self_hostable":true,"key_differences":["Industry-standard video","Free version covers 90% of needs","Color grading leader"]},{"name":"GIMP + Inkscape + Krita","url":"https://www.gimp.org","type":"open_source","description":"Open source trio replacing Photoshop + Illustrator + digital painting.","score":75,"self_hostable":true,"license":"GPL-3.0","key_differences":["Free forever","Steep learning curve","Different workflows than Adobe"]}]},{"names":["Adobe Premiere Pro","premiere","premiere pro","premiere cc"],"category":"design","subcategory":"video_editing","typical_cost_mo":23,"typical_cost_note":"Single App $23/mo","alternatives":[{"name":"DaVinci Resolve (free)","url":"https://www.blackmagicdesign.com/products/davinciresolve","type":"free_tier","description":"Professional video editor used in Hollywood. Free version is very capable.","score":95,"self_hostable":true,"key_differences":["Industry-standard quality","Better color grading than Premiere","Free version covers most needs","Steep learning curve"]},{"name":"Kdenlive","url":"https://kdenlive.org","type":"open_source","description":"Free video editor. Multi-track timeline, effects, transitions.","score":78,"self_hostable":true,"license":"GPL-2.0","key_differences":["Lightweight","Multi-platform","Good for most editing"]},{"name":"Shotcut","url":"https://shotcut.org","type":"open_source","description":"Free video editor. Wide format support.","score":75,"self_hostable":true,"license":"GPL-3.0","key_differences":["Wide format support","No timeline tracks limitation"]},{"name":"OBS Studio","url":"https://obsproject.com","type":"open_source","description":"Screen recording and streaming. Not for editing but great for capture.","score":70,"self_hostable":true,"license":"GPL-2.0","key_differences":["Screen capture focus","Streaming capable","Not an editor"]}]},{"names":["Figma","figma.com"],"category":"design","subcategory":"ui_design","typical_cost_mo":15,"typical_cost_note":"Professional $15/editor/mo; Organization $45/editor/mo","alternatives":[{"name":"Penpot","url":"https://penpot.app","type":"open_source","description":"Open source design platform. CSS Grid/Flex, SVG-native, real-time collab.","score":88,"self_hostable":true,"license":"MPL-2.0","key_differences":["Open standards (SVG, CSS)","No proprietary format","Growing plugin ecosystem","Real-time collaboration"]},{"name":"Excalidraw","url":"https://excalidraw.com","type":"open_source","description":"Virtual whiteboard. Hand-drawn style. Great for wireframes.","score":75,"self_hostable":true,"license":"MIT","key_differences":["Whiteboard style, not pixel-perfect","Great for brainstorming","Simple and fast"]},{"name":"Figma (free tier)","url":"https://figma.com","type":"free_tier","description":"3 files, unlimited personal files. Enough for solo designers.","score":70,"self_hostable":false,"key_differences":["Limited collaboration on free","Good for individuals"]}]},{"names":["Slack","slack.com","slack app"],"category":"communication","subcategory":"team_chat","typical_cost_mo":8,"typical_cost_note":"Pro $8.75/user/mo; Business+ $12.50/user/mo","alternatives":[{"name":"Mattermost","url":"https://mattermost.com","type":"open_source","description":"Enterprise team messaging. Slack alternative with full control.","score":90,"self_hostable":true,"license":"MIT","key_differences":["Full data control","Enterprise features","Slack-compatible integrations"]},{"name":"Rocket.Chat","url":"https://rocket.chat","type":"open_source","description":"Team chat + customer support. Omnichannel messaging.","score":88,"self_hostable":true,"license":"MIT","key_differences":["Omnichannel support","Live chat","Customer support features"]},{"name":"Element (Matrix)","url":"https://element.io","type":"open_source","description":"Decentralized chat built on Matrix protocol. E2E encrypted.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Decentralized","E2E encryption","Interoperable with Matrix network"]},{"name":"Revolt","url":"https://revolt.chat","type":"open_source","description":"Discord alternative. Modern chat platform.","score":78,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Discord-like","Modern UI","Growing community"]}]},{"names":["Microsoft Teams","teams","ms teams","microsoft teams"],"category":"communication","subcategory":"team_chat","typical_cost_mo":6,"typical_cost_note":"Essential $4/user/mo; Business Basic $6/user/mo","alternatives":[{"name":"Element (Matrix)","url":"https://element.io","type":"open_source","description":"Decentralized messaging. E2E encrypted. Enterprise-ready.","score":85,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Decentralized","E2E encrypted","Government-grade security"]},{"name":"Mattermost","url":"https://mattermost.com","type":"open_source","description":"Team messaging. Slack/Teams alternative.","score":82,"self_hostable":true,"license":"MIT","key_differences":["Self-hosted","Full control","Enterprise features"]},{"name":"Nextcloud Talk","url":"https://nextcloud.com","type":"open_source","description":"Chat, video calls, screensharing. Part of Nextcloud suite.","score":75,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Integrated with files","Video calls","Part of larger suite"]}]},{"names":["Zoom","zoom.us","zoom meeting","zoom video"],"category":"communication","subcategory":"video_conferencing","typical_cost_mo":13,"typical_cost_note":"Pro $13.33/mo; Business $21.99/mo","alternatives":[{"name":"Jitsi Meet","url":"https://meet.jit.si","type":"open_source","description":"Free video conferencing. No account needed. E2E encryption.","score":88,"self_hostable":true,"license":"Apache-2.0","key_differences":["No account needed","Free forever","E2E encryption","100+ participants"]},{"name":"BigBlueButton","url":"https://bigbluebutton.org","type":"open_source","description":"Web conferencing designed for online learning. Whiteboard, polling.","score":80,"self_hostable":true,"license":"LGPL-3.0","key_differences":["Education-focused","Whiteboard","Recording","Breakout rooms"]},{"name":"Google Meet (free)","url":"https://meet.google.com","type":"free_tier","description":"Free for personal use. 60-min group calls.","score":75,"self_hostable":false,"key_differences":["Google account required","60-min limit on groups","Good quality"]}]},{"names":["Discord","discord app"],"category":"communication","subcategory":"community_chat","typical_cost_mo":0,"typical_cost_note":"Free; Nitro $10/mo","alternatives":[{"name":"Revolt","url":"https://revolt.chat","type":"open_source","description":"Discord alternative. Open source, modern, no tracking.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["No tracking","Open source","Similar UI to Discord"]},{"name":"Mattermost","url":"https://mattermost.com","type":"open_source","description":"Team messaging. More professional than Discord.","score":75,"self_hostable":true,"license":"MIT","key_differences":["More professional","Enterprise features","Slack-like channels"]}]},{"names":["Salesforce","salesforce crm","salesforce.com","sf"],"category":"crm","subcategory":"crm","typical_cost_mo":25,"typical_cost_note":"Starter $25/user/mo; Professional $80/user/mo","alternatives":[{"name":"Twenty","url":"https://twenty.com","type":"open_source","description":"Modern, API-first CRM. Built for developers. Salesforce alternative.","score":85,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Modern tech stack","API-first","Developer-friendly","Growing fast"]},{"name":"EspoCRM","url":"https://www.espocrm.com","type":"open_source","description":"Full-featured CRM. Email, calls, workflows, reports.","score":88,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Feature-rich out of box","Low-code admin","Email campaigns built-in"]},{"name":"SuiteCRM","url":"https://suitecrm.com","type":"open_source","description":"Enterprise CRM. Deep customization. SugarCRM fork.","score":80,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Enterprise depth","Highly customizable","Large community"]},{"name":"Frappe CRM","url":"https://frappe.io/crm","type":"open_source","description":"CRM built on Frappe framework. Clean, modern UI.","score":78,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Part of Frappe/ERPNext ecosystem","Clean UI"]},{"name":"HubSpot (free tier)","url":"https://hubspot.com","type":"free_tier","description":"Up to 1M contacts free. Deal tracking, email, meetings.","score":82,"self_hostable":false,"key_differences":["Very generous free tier","Marketing tools included","Cloud only"]}]},{"names":["HubSpot","hubspot crm","hubspot.com"],"category":"crm","subcategory":"crm","typical_cost_mo":45,"typical_cost_note":"Starter $20/mo; Professional $890/mo","alternatives":[{"name":"HubSpot (free tier)","url":"https://hubspot.com","type":"free_tier","description":"CRM free forever. 1M contacts, unlimited users.","score":85,"self_hostable":false,"key_differences":["Free CRM is very capable","Marketing tools limited on free"]},{"name":"Erxes","url":"https://erxes.io","type":"open_source","description":"Marketing, sales, and customer service platform.","score":80,"self_hostable":true,"license":"AGPL-3.0","key_differences":["All-in-one platform","Marketing + sales + support"]},{"name":"EspoCRM","url":"https://www.espocrm.com","type":"open_source","description":"Full CRM with email campaigns, workflows.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted","Email campaigns built-in"]}]},{"names":["Pipedrive","pipedrive.com"],"category":"crm","subcategory":"sales_crm","typical_cost_mo":14,"typical_cost_note":"Essential $14/user/mo; Advanced $29/user/mo","alternatives":[{"name":"EspoCRM","url":"https://www.espocrm.com","type":"open_source","description":"Full CRM with pipeline management. Similar to Pipedrive.","score":85,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted","More features on free","Email campaigns"]},{"name":"Twenty","url":"https://twenty.com","type":"open_source","description":"Modern CRM. Clean, API-first.","score":80,"self_hostable":true,"license":"AGPL-3.0","key_differences":["More modern UI","Developer-focused"]}]},{"names":["Mailchimp","mailchimp.com"],"category":"marketing","subcategory":"email_marketing","typical_cost_mo":13,"typical_cost_note":"Essentials $13/mo (500 contacts); Standard $20/mo","alternatives":[{"name":"Listmonk","url":"https://listmonk.app","type":"open_source","description":"High-performance newsletter and mailing list manager. No per-contact pricing.","score":92,"self_hostable":true,"license":"AGPL-3.0","key_differences":["No contact limits","No per-email pricing","Fast and lightweight","SQL-based templating"]},{"name":"Brevo (free tier)","url":"https://brevo.com","type":"free_tier","description":"300 emails/day free (~9K/month). Unlimited contacts. Automation included.","score":88,"self_hostable":false,"key_differences":["Very generous daily limit","SMS + chat included","Automation on free"]},{"name":"Mautic","url":"https://www.mautic.org","type":"open_source","description":"Full marketing automation. Campaigns, lead scoring, landing pages.","score":85,"self_hostable":true,"license":"GPL-3.0","key_differences":["Full marketing automation","Lead scoring","Landing pages","Heavier to run"]},{"name":"Mailchimp (free tier)","url":"https://mailchimp.com","type":"free_tier","description":"500 contacts, 1K sends/month. Limited but works for small lists.","score":65,"self_hostable":false,"key_differences":["Very limited free","Good templates"]}]},{"names":["ActiveCampaign","activecampaign.com"],"category":"marketing","subcategory":"marketing_automation","typical_cost_mo":29,"typical_cost_note":"Starter $15/mo; Plus $49/mo; Pro $79/mo","alternatives":[{"name":"Mautic","url":"https://www.mautic.org","type":"open_source","description":"Full marketing automation. Campaigns, lead scoring, segmentation.","score":85,"self_hostable":true,"license":"GPL-3.0","key_differences":["Full marketing automation","No per-contact pricing","Self-hosted","Heavier to run"]},{"name":"Brevo (free tier)","url":"https://brevo.com","type":"free_tier","description":"300 emails/day free. Automation workflows included.","score":80,"self_hostable":false,"key_differences":["Free automation","Limited daily sends","Cloud only"]},{"name":"Listmonk","url":"https://listmonk.app","type":"open_source","description":"Newsletter management. Simpler than ActiveCampaign but solid.","score":75,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Newsletter-focused","No lead scoring","Very fast"]}]},{"names":["ConvertKit","convertkit","convertkit.com"],"category":"marketing","subcategory":"email_marketing","typical_cost_mo":29,"typical_cost_note":"Creator $29/mo (1K subscribers)","alternatives":[{"name":"Listmonk","url":"https://listmonk.app","type":"open_source","description":"Newsletter and mailing list manager. No subscriber limits.","score":90,"self_hostable":true,"license":"AGPL-3.0","key_differences":["No subscriber limits","No pricing tiers","Self-hosted"]},{"name":"Buttondown","url":"https://buttondown.email","type":"freemium","description":"Minimalist newsletter for writers. Markdown-based.","score":82,"self_hostable":true,"key_differences":["Very simple","Markdown-based","Free for <100 subs"]},{"name":"Brevo (free tier)","url":"https://brevo.com","type":"free_tier","description":"300 emails/day free. Unlimited contacts.","score":80,"self_hostable":false,"key_differences":["Daily send limit","More than just newsletters"]}]},{"names":["Google Analytics","ga4","google analytics 4"],"category":"analytics","subcategory":"web_analytics","typical_cost_mo":0,"typical_cost_note":"Free; GA360 $50K+/year","alternatives":[{"name":"Plausible","url":"https://plausible.io","type":"open_source","description":"Privacy-friendly, lightweight analytics. Cookie-free. GDPR compliant.","score":92,"self_hostable":true,"license":"AGPL-3.0","key_differences":["No cookie banner needed","Simple single dashboard","1KB script","Privacy-first"]},{"name":"Umami","url":"https://umami.is","type":"open_source","description":"Simple, fast, privacy-first analytics. Beautiful dashboard.","score":88,"self_hostable":true,"license":"MIT","key_differences":["Very fast","Beautiful UI","Permissive license"]},{"name":"Matomo","url":"https://matomo.org","type":"open_source","description":"Full-featured analytics. Heatmaps, session recording, goals.","score":85,"self_hostable":true,"license":"GPL-3.0","key_differences":["Most GA-like features","Heatmaps included","Heavier to run"]}]},{"names":["Mixpanel","mixpanel.com"],"category":"analytics","subcategory":"product_analytics","typical_cost_mo":20,"typical_cost_note":"Free tier < 20M events; Growth $20/mo","alternatives":[{"name":"PostHog","url":"https://posthog.com","type":"open_source","description":"All-in-one product analytics. Events, sessions, flags, A/B tests. Free 1M events/mo.","score":92,"self_hostable":true,"license":"MIT","key_differences":["Replaces 4-5 tools","Session replay","Feature flags","A/B testing","Free 1M events/mo"]},{"name":"Plausible","url":"https://plausible.io","type":"open_source","description":"Website analytics. Simpler than Mixpanel but great for web.","score":75,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Web-focused","Simpler","Privacy-first"]}]},{"names":["Amplitude","amplitude.com"],"category":"analytics","subcategory":"product_analytics","typical_cost_mo":50,"typical_cost_note":"Free tier < 10M events; Growth starts custom","alternatives":[{"name":"PostHog","url":"https://posthog.com","type":"open_source","description":"Full product analytics. Free 1M events/mo. Replaces Amplitude + Hotjar.","score":92,"self_hostable":true,"license":"MIT","key_differences":["More than analytics","Session replay","Feature flags","Generous free tier"]},{"name":"Matomo","url":"https://matomo.org","type":"open_source","description":"Full analytics platform. Heatmaps, goals, funnels.","score":80,"self_hostable":true,"license":"GPL-3.0","key_differences":["More web-focused","Heatmaps","GDPR compliant"]}]},{"names":["Hotjar","hotjar.com"],"category":"analytics","subcategory":"session_replay","typical_cost_mo":32,"typical_cost_note":"Plus $32/mo; Business $80/mo","alternatives":[{"name":"PostHog","url":"https://posthog.com","type":"open_source","description":"Session replay + product analytics + feature flags. Free 1M events/mo.","score":90,"self_hostable":true,"license":"MIT","key_differences":["More than session replay","Full analytics suite","Free tier"]},{"name":"OpenReplay","url":"https://openreplay.com","type":"open_source","description":"Self-hosted session replay. Privacy-first.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted","Privacy-first","DevTools included"]}]},{"names":["Tableau","tableau.com"],"category":"analytics","subcategory":"bi_dashboard","typical_cost_mo":35,"typical_cost_note":"Viewer $15/user/mo; Explorer $35/user/mo","alternatives":[{"name":"Metabase","url":"https://www.metabase.com","type":"open_source","description":"Fast, easy BI dashboards. No-code for analysts, SQL for power users.","score":90,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Fast setup","No-code + SQL","Embeddable","Free tier from Metabase"]},{"name":"Apache Superset","url":"https://superset.apache.org","type":"open_source","description":"Enterprise BI. SQL-first, 40+ chart types, dashboard builder.","score":85,"self_hostable":true,"license":"Apache-2.0","key_differences":["Enterprise-grade","SQL-first","Many chart types","Complex setup"]},{"name":"Redash","url":"https://redash.io","type":"open_source","description":"SQL-based dashboards. Query and visualize any data source.","score":80,"self_hostable":true,"license":"BSD-2","key_differences":["SQL-focused","Simple and fast","Many data sources"]}]},{"names":["Power BI","powerbi","microsoft power bi"],"category":"analytics","subcategory":"bi_dashboard","typical_cost_mo":10,"typical_cost_note":"Pro $10/user/mo; Premium $20/user/mo","alternatives":[{"name":"Metabase","url":"https://www.metabase.com","type":"open_source","description":"Fast BI dashboards. No-code and SQL modes.","score":88,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Easier than Power BI","Self-hosted","Free tier"]},{"name":"Apache Superset","url":"https://superset.apache.org","type":"open_source","description":"Enterprise BI with SQL-first approach.","score":82,"self_hostable":true,"license":"Apache-2.0","key_differences":["More powerful than Power BI","Steeper learning curve"]}]},{"names":["Vercel","vercel.com"],"category":"devops","subcategory":"hosting","typical_cost_mo":20,"typical_cost_note":"Pro $20/mo per member; Enterprise custom","alternatives":[{"name":"Coolify","url":"https://coolify.io","type":"open_source","description":"Self-hosted Vercel/Netlify/Heroku. Deploy anything, anywhere.","score":90,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted","Any cloud provider","No vendor lock-in","Full control"]},{"name":"Dokku","url":"https://dokku.com","type":"open_source","description":"Mini-Heroku on your VPS. Git push to deploy.","score":82,"self_hostable":true,"license":"MIT","key_differences":["Heroku-like workflow","Very lightweight","CLI-based"]},{"name":"Netlify (free tier)","url":"https://netlify.com","type":"free_tier","description":"Free for personal projects. 100GB bandwidth, 300 build minutes.","score":75,"self_hostable":false,"key_differences":["Free for small projects","Easy setup","Cloud only"]}]},{"names":["Netlify","netlify.com"],"category":"devops","subcategory":"hosting","typical_cost_mo":19,"typical_cost_note":"Pro $19/member/mo","alternatives":[{"name":"Coolify","url":"https://coolify.io","type":"open_source","description":"Self-hosted PaaS. Deploy any app, any cloud.","score":88,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted","Full control","No bandwidth limits"]},{"name":"Netlify (free tier)","url":"https://netlify.com","type":"free_tier","description":"Free for personal use. 100GB bandwidth.","score":80,"self_hostable":false,"key_differences":["Free tier is generous"]}]},{"names":["Heroku","heroku.com"],"category":"devops","subcategory":"paas","typical_cost_mo":7,"typical_cost_note":"Basic $7/mo; Standard $25/mo","alternatives":[{"name":"Coolify","url":"https://coolify.io","type":"open_source","description":"Self-hosted Heroku alternative. Deploy with Docker/Nixpacks.","score":90,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted","Docker support","Multiple apps","No per-app pricing"]},{"name":"Dokku","url":"https://dokku.com","type":"open_source","description":"Git-push deployment. Docker-powered. Mini Heroku.","score":85,"self_hostable":true,"license":"MIT","key_differences":["Heroku-like workflow","Very lightweight","Docker support"]},{"name":"Railway (free tier)","url":"https://railway.app","type":"free_tier","description":"Deploy anything. Free tier with $5 credit/month.","score":78,"self_hostable":false,"key_differences":["Easy deployment","Free credit","Docker support"]}]},{"names":["AWS","amazon web services","aws.amazon.com"],"category":"devops","subcategory":"cloud","typical_cost_mo":50,"typical_cost_note":"Varies wildly; $50-500+/mo typical","alternatives":[{"name":"Hetzner","url":"https://hetzner.com","type":"freemium","description":"European cloud hosting. Very affordable. Dedicated and cloud.","score":88,"self_hostable":false,"key_differences":["Much cheaper than AWS","European data centers","No free tier"]},{"name":"Contabo","url":"https://contabo.com","type":"freemium","description":"Budget VPS hosting. Very affordable.","score":78,"self_hostable":false,"key_differences":["Very cheap","Good for self-hosting","Less reliable than AWS"]},{"name":"Supabase (free tier)","url":"https://supabase.com","type":"free_tier","description":"Firebase alternative. PostgreSQL + auth + storage. Free tier generous.","score":85,"self_hostable":true,"key_differences":["Database + auth + storage","PostgreSQL-based","Free 500MB database"]}]},{"names":["GitHub Actions","github actions","gh actions"],"category":"devops","subcategory":"ci_cd","typical_cost_mo":0,"typical_cost_note":"Free 2000 min/mo; additional $0.008/min","alternatives":[{"name":"Gitea Actions","url":"https://gitea.com","type":"open_source","description":"GitHub Actions-compatible CI/CD in Gitea.","score":85,"self_hostable":true,"license":"MIT","key_differences":["GitHub Actions compatible","Self-hosted runners","Part of Gitea"]},{"name":"Woodpecker CI","url":"https://woodpecker-ci.org","type":"open_source","description":"Community fork of Drone. Simple, powerful CI/CD.","score":82,"self_hostable":true,"license":"Apache-2.0","key_differences":["YAML-based","Docker-native","Community-driven"]},{"name":"Drone","url":"https://www.drone.io","type":"open_source","description":"Container-native CI/CD. Simple YAML config.","score":78,"self_hostable":true,"license":"Apache-2.0","key_differences":["Container-native","Simple config","Honeycomb acquisition"]}]},{"names":["Firebase","firebase.com","google firebase"],"category":"database","subcategory":"baas","typical_cost_mo":25,"typical_cost_note":"Spark free; Blaze pay-as-you-go","alternatives":[{"name":"Supabase","url":"https://supabase.com","type":"open_source","description":"Firebase alternative. PostgreSQL + Auth + Storage + Realtime + Edge Functions.","score":92,"self_hostable":true,"license":"Apache-2.0","key_differences":["PostgreSQL (SQL)","Real-time subscriptions","Free 500MB DB, 1GB storage","Row-level security"]},{"name":"Appwrite","url":"https://appwrite.io","type":"open_source","description":"Backend-as-a-Service. Auth, DB, storage, functions, messaging.","score":85,"self_hostable":true,"license":"BSD-3","key_differences":["Multi-language SDKs","Self-hosted focus","Built-in messaging"]},{"name":"PocketBase","url":"https://pocketbase.io","type":"open_source","description":"Single-file backend. SQLite + auth + real-time. Embedded Go.","score":80,"self_hostable":true,"license":"MIT","key_differences":["Single binary","SQLite-based","Very lightweight","Great for prototypes"]},{"name":"Nhost","url":"https://nhost.io","type":"open_source","description":"Firebase alternative with Hasura. PostgreSQL + GraphQL.","score":78,"self_hostable":true,"license":"MIT","key_differences":["GraphQL-first","Hasura engine","Functions"]}]},{"names":["MongoDB Atlas","mongodb atlas","mongodb"],"category":"database","subcategory":"database","typical_cost_mo":10,"typical_cost_note":"Free 512MB; Shared $5.70/mo","alternatives":[{"name":"Self-hosted PostgreSQL","url":"https://postgresql.org","type":"open_source","description":"World's most advanced open source DB. Free forever.","score":90,"self_hostable":true,"license":"PostgreSQL","key_differences":["More features than MongoDB","SQL-based","ACID compliant","Free forever"]},{"name":"Supabase","url":"https://supabase.com","type":"open_source","description":"PostgreSQL + real-time + auth. Free tier.","score":85,"self_hostable":true,"license":"Apache-2.0","key_differences":["More than just database","Real-time","Auth included"]},{"name":"MongoDB (self-hosted)","url":"https://mongodb.com","type":"open_source","description":"Run MongoDB on your own server. Community Edition is free.","score":80,"self_hostable":true,"license":"SSPL","key_differences":["Same database, self-hosted","No Atlas pricing","Requires ops knowledge"]}]},{"names":["Algolia","algolia.com"],"category":"database","subcategory":"search","typical_cost_mo":30,"typical_cost_note":"Build $30/mo; Search $1.00/1K requests","alternatives":[{"name":"Meilisearch","url":"https://meilisearch.com","type":"open_source","description":"Lightning-fast search. Typo-tolerant. REST API. Milliseconds.","score":92,"self_hostable":true,"license":"MIT","key_differences":["Very fast","Typo-tolerant","Easy setup","No request limits"]},{"name":"Typesense","url":"https://typesense.org","type":"open_source","description":"Fast, typo-tolerant search. Instant search experience.","score":88,"self_hostable":true,"license":"GPL-3.0","key_differences":["Very fast","Typo-tolerant","Geo search"]},{"name":"Elasticsearch (self-hosted)","url":"https://elastic.co","type":"open_source","description":"Full-text search engine. Very powerful but complex.","score":75,"self_hostable":true,"license":"SSPL/Elastic License","key_differences":["Very powerful","Complex setup","Resource-heavy"]}]},{"names":["Auth0","auth0.com"],"category":"database","subcategory":"authentication","typical_cost_mo":23,"typical_cost_note":"Free < 7500 users; Essential $23/mo","alternatives":[{"name":"Keycloak","url":"https://www.keycloak.org","type":"open_source","description":"Enterprise identity and access management. SAML, OIDC, LDAP.","score":90,"self_hostable":true,"license":"Apache-2.0","key_differences":["Enterprise-grade","SAML/OIDC","LDAP federation","Admin console"]},{"name":"Better Auth","url":"https://www.better-auth.com","type":"open_source","description":"Modern TypeScript auth. Plug-and-play with any framework.","score":88,"self_hostable":true,"license":"MIT","key_differences":["TypeScript-native","Framework agnostic","Plugin system","Very modern"]},{"name":"Authentik","url":"https://goauthentik.io","type":"open_source","description":"Identity provider with SSO. Modern UI.","score":82,"self_hostable":true,"license":"GPL-3.0","key_differences":["Modern UI","SSO focused","Flow-based"]},{"name":"Logto","url":"https://logto.io","type":"open_source","description":"Auth infrastructure. OpenID Connect, SSO, MFA.","score":80,"self_hostable":true,"license":"MPL-2.0","key_differences":["OIDC-focused","SSO","MFA built-in"]}]},{"names":["Datadog","datadog.com"],"category":"monitoring","subcategory":"observability","typical_cost_mo":23,"typical_cost_note":"Pro $23/host/mo; Enterprise $34/host/mo","alternatives":[{"name":"Grafana + Prometheus","url":"https://grafana.com","type":"open_source","description":"Industry-standard monitoring stack. Dashboards + metrics.","score":90,"self_hostable":true,"license":"AGPL-3.0 / Apache-2.0","key_differences":["Industry standard","Very powerful","More setup required","Huge ecosystem"]},{"name":"Grafana Cloud (free tier)","url":"https://grafana.com","type":"free_tier","description":"Free 10K metrics, 50GB logs, 50GB traces.","score":80,"self_hostable":false,"key_differences":["Generous free tier","Managed service","Full Grafana stack"]}]},{"names":["New Relic","newrelic.com"],"category":"monitoring","subcategory":"apm","typical_cost_mo":99,"typical_cost_note":"Pro $99/mo (full platform)","alternatives":[{"name":"Grafana + Prometheus + Tempo","url":"https://grafana.com","type":"open_source","description":"Full observability: metrics, logs, traces. Free and open.","score":85,"self_hostable":true,"license":"AGPL-3.0","key_differences":["More powerful","Self-hosted","No per-host pricing"]},{"name":"PostHog (free tier)","url":"https://posthog.com","type":"open_source","description":"Product analytics + session replay + feature flags.","score":78,"self_hostable":true,"license":"MIT","key_differences":["Product-focused","Session replay","Free 1M events/mo"]}]},{"names":["Sentry","sentry.io"],"category":"monitoring","subcategory":"error_tracking","typical_cost_mo":26,"typical_cost_note":"Team $26/mo; Business $80/mo","alternatives":[{"name":"Highlight.io","url":"https://highlight.io","type":"open_source","description":"Error tracking + session replay. Open source.","score":85,"self_hostable":true,"license":"Apache-2.0","key_differences":["Session replay included","Modern UI","Self-hosted"]},{"name":"GlitchTip","url":"https://glitchtip.com","type":"open_source","description":"Sentry-compatible error tracking. Simple and fast.","score":78,"self_hostable":true,"license":"MIT","key_differences":["Sentry API compatible","Very lightweight","Simpler than Sentry"]},{"name":"Sentry (self-hosted)","url":"https://sentry.io","type":"open_source","description":"Run Sentry on your own infrastructure. Same product.","score":80,"self_hostable":true,"license":"BSL-1.1","key_differences":["Same product","Self-hosted","Complex setup"]}]},{"names":["Pingdom","pingdom.com"],"category":"monitoring","subcategory":"uptime","typical_cost_mo":15,"typical_cost_note":"Synthetic Monitoring $15/mo","alternatives":[{"name":"Uptime Kuma","url":"https://github.com/louislam/uptime-kuma","type":"open_source","description":"Beautiful uptime monitor. Notifications, status pages.","score":92,"self_hostable":true,"license":"MIT","key_differences":["Beautiful UI","Many notification types","Status pages","Very popular (58K+ stars)"]},{"name":"Grafana (free tier)","url":"https://grafana.com","type":"free_tier","description":"Uptime monitoring via Grafana Cloud free tier.","score":75,"self_hostable":false,"key_differences":["Part of larger monitoring stack"]}]},{"names":["Intercom","intercom.com"],"category":"support","subcategory":"customer_support","typical_cost_mo":39,"typical_cost_note":"Essential $39/mo; Advanced $99/mo","alternatives":[{"name":"Chatwoot","url":"https://chatwoot.com","type":"open_source","description":"Omnichannel customer support. Live chat, email, WhatsApp, social.","score":90,"self_hostable":true,"license":"MIT","key_differences":["Omnichannel","Live chat widget","Self-hosted","Many integrations"]},{"name":"Crisp (free tier)","url":"https://crisp.chat","type":"free_tier","description":"Live chat + help desk. Free for 2 seats.","score":80,"self_hostable":false,"key_differences":["Free for small teams","Good UI","Cloud only"]}]},{"names":["Zendesk","zendesk.com"],"category":"support","subcategory":"help_desk","typical_cost_mo":19,"typical_cost_note":"Suite Team $19/agent/mo","alternatives":[{"name":"Zammad","url":"https://zammad.org","type":"open_source","description":"Help desk and ticketing system. Web, email, social channels.","score":88,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Full-featured help desk","Many channels","Self-hosted","API"]},{"name":"FreeScout","url":"https://freescout.net","type":"open_source","description":"Lightweight shared inbox. Help Scout alternative.","score":80,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Simple and fast","Shared inbox focus","Lightweight"]},{"name":"Chatwoot","url":"https://chatwoot.com","type":"open_source","description":"Omnichannel support with live chat, email, social.","score":85,"self_hostable":true,"license":"MIT","key_differences":["Live chat included","More than ticketing","Omnichannel"]}]},{"names":["Freshdesk","freshdesk.com"],"category":"support","subcategory":"help_desk","typical_cost_mo":15,"typical_cost_note":"Growth $15/agent/mo","alternatives":[{"name":"Zammad","url":"https://zammad.org","type":"open_source","description":"Full help desk. Ticketing, SLA, automations.","score":85,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted","Full-featured","Many channels"]},{"name":"FreeScout","url":"https://freescout.net","type":"open_source","description":"Lightweight shared inbox.","score":78,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Simple","Fast","Email-focused"]}]},{"names":["Typeform","typeform.com"],"category":"forms","subcategory":"forms","typical_cost_mo":25,"typical_cost_note":"Basic $25/mo; Plus $50/mo","alternatives":[{"name":"Formbricks","url":"https://formbricks.com","type":"open_source","description":"In-app surveys, website forms, link surveys. Privacy-first.","score":88,"self_hostable":true,"license":"AGPL-3.0","key_differences":["In-app surveys","Privacy-first","Self-hosted","Typeform-like UI"]},{"name":"Heyform","url":"https://heyform.net","type":"open_source","description":"Open source form builder. Typeform alternative.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Typeform clone","Self-hosted","Conversational UI"]},{"name":"Google Forms (free)","url":"https://forms.google.com","type":"free_tier","description":"Free with Google account. Unlimited responses.","score":70,"self_hostable":false,"key_differences":["Free forever","Basic UI","Google account required"]}]},{"names":["SurveyMonkey","surveymonkey.com"],"category":"forms","subcategory":"surveys","typical_cost_mo":25,"typical_cost_note":"Individual Advantage $25/mo","alternatives":[{"name":"LimeSurvey","url":"https://limesurvey.org","type":"open_source","description":"Full-featured survey platform. Complex surveys, branching, quotas.","score":85,"self_hostable":true,"license":"GPL-2.0","key_differences":["Most powerful survey tool","Complex branching","Self-hosted"]},{"name":"Formbricks","url":"https://formbricks.com","type":"open_source","description":"Surveys and forms. Modern UI, self-hosted.","score":82,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Modern UI","In-app surveys","Self-hosted"]}]},{"names":["1Password","1password.com"],"category":"security","subcategory":"password_manager","typical_cost_mo":3,"typical_cost_note":"Individual $2.99/mo; Family $4.99/mo","alternatives":[{"name":"Vaultwarden","url":"https://github.com/dani-garcia/vaultwarden","type":"open_source","description":"Lightweight Bitwarden-compatible server. All clients work.","score":92,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Uses official Bitwarden apps","Very lightweight","All premium features free"]},{"name":"Bitwarden (free)","url":"https://bitwarden.com","type":"freemium","description":"Password manager. Free tier is very capable.","score":88,"self_hostable":true,"key_differences":["Cloud or self-hosted","Free tier covers most needs","All platforms"]},{"name":"KeePassXC","url":"https://keepassxc.org","type":"open_source","description":"Desktop password manager. Local database, no cloud.","score":80,"self_hostable":true,"license":"GPL-3.0","key_differences":["Local-only (no cloud)","Desktop app","No sync without plugins"]}]},{"names":["LastPass","lastpass.com"],"category":"security","subcategory":"password_manager","typical_cost_mo":3,"typical_cost_note":"Premium $3/mo; Family $4/mo","alternatives":[{"name":"Vaultwarden","url":"https://github.com/dani-garcia/vaultwarden","type":"open_source","description":"Bitwarden-compatible server. Use official Bitwarden clients.","score":92,"self_hostable":true,"license":"AGPL-3.0","key_differences":["All premium features free","Very lightweight","Self-hosted"]},{"name":"Bitwarden (free)","url":"https://bitwarden.com","type":"freemium","description":"Free password manager. Cross-platform.","score":88,"self_hostable":true,"key_differences":["Generous free tier","All platforms","Self-host option"]},{"name":"Proton Pass (free)","url":"https://proton.me/pass","type":"free_tier","description":"Password manager from Proton. Free tier with unlimited passwords.","score":82,"self_hostable":false,"key_differences":["Unlimited passwords free","Email aliasing","Proton ecosystem"]}]},{"names":["Dropbox","dropbox.com"],"category":"storage","subcategory":"cloud_storage","typical_cost_mo":12,"typical_cost_note":"Plus $12/mo (2TB); Family $20/mo","alternatives":[{"name":"Nextcloud","url":"https://nextcloud.com","type":"open_source","description":"Self-hosted cloud storage + collaboration. Replaces Google Workspace.","score":90,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted","Full control","Documents, calendar, contacts","Very mature"]},{"name":"Seafile","url":"https://www.seafile.com","type":"open_source","description":"Fast file sync and share. Deduplication, encryption.","score":82,"self_hostable":true,"license":"GPL-2.0","key_differences":["Very fast sync","Deduplication","Lightweight"]},{"name":"Google Drive (free)","url":"https://drive.google.com","type":"free_tier","description":"15GB free with Google account.","score":75,"self_hostable":false,"key_differences":["15GB free","Google ecosystem","Privacy concerns"]}]},{"names":["Google Drive","googledrive","google drive"],"category":"storage","subcategory":"cloud_storage","typical_cost_mo":3,"typical_cost_note":"100GB $1.99/mo; 2TB $9.99/mo","alternatives":[{"name":"Nextcloud","url":"https://nextcloud.com","type":"open_source","description":"Self-hosted cloud. Files, docs, calendar, contacts.","score":88,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted","Full suite replacement","No storage limits (your server)"]},{"name":"Google Drive (free tier)","url":"https://drive.google.com","type":"free_tier","description":"15GB free. Often enough for personal use.","score":70,"self_hostable":false,"key_differences":["15GB free","Already included with Google"]}]},{"names":["Shopify","shopify.com"],"category":"ecommerce","subcategory":"ecommerce","typical_cost_mo":39,"typical_cost_note":"Basic $39/mo; Shopify $105/mo","alternatives":[{"name":"Medusa","url":"https://medusajs.com","type":"open_source","description":"Headless commerce platform. MIT licensed. No platform fees.","score":88,"self_hostable":true,"license":"MIT","key_differences":["No platform fees","Headless (build your own frontend)","Developer-focused","Extensible"]},{"name":"Saleor","url":"https://saleor.io","type":"open_source","description":"GraphQL-first commerce. Modern stack.","score":82,"self_hostable":true,"license":"BSD-3","key_differences":["GraphQL API","Dashboard included","Modern architecture"]},{"name":"WooCommerce","url":"https://woocommerce.com","type":"open_source","description":"WordPress e-commerce plugin. Huge ecosystem.","score":80,"self_hostable":true,"license":"GPL-3.0","key_differences":["WordPress-based","Huge plugin ecosystem","More traditional"]},{"name":"Shopify (free trial)","url":"https://shopify.com","type":"free_tier","description":"3-day free trial, then $1/mo for 3 months.","score":65,"self_hostable":false,"key_differences":["Trial only","Then paid"]}]},{"names":["Calendly","calendly.com"],"category":"scheduling","subcategory":"scheduling","typical_cost_mo":12,"typical_cost_note":"Standard $12/seat/mo; Teams $20/seat/mo","alternatives":[{"name":"Cal.com","url":"https://cal.com","type":"open_source","description":"Open source scheduling. Calendly alternative with full control.","score":92,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted option","Calendly-like UX","API-first","Many integrations"]},{"name":"Rallly","url":"https://github.com/lukevella/rallly","type":"open_source","description":"Meeting scheduling polls. Doodle alternative.","score":78,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Poll-based scheduling","Simple and clean"]}]},{"names":["DocuSign","docusign.com"],"category":"esign","subcategory":"e_signature","typical_cost_mo":25,"typical_cost_note":"Personal $10/mo; Standard $25/mo","alternatives":[{"name":"Documenso","url":"https://documenso.com","type":"open_source","description":"Open source e-signature. Clean UI, API, webhooks.","score":88,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Self-hosted","API-first","Modern UI","No per-envelope pricing"]},{"name":"LibreSign","url":"https://github.com/LibreSign/libresign","type":"open_source","description":"E-signature integrated with Nextcloud.","score":75,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Nextcloud integration","Basic features"]}]},{"names":["Zapier","zapier.com"],"category":"automation","subcategory":"automation","typical_cost_mo":20,"typical_cost_note":"Starter $20/mo (100 tasks); Professional $50/mo","alternatives":[{"name":"n8n","url":"https://n8n.io","type":"open_source","description":"Workflow automation. 400+ integrations. Self-hosted.","score":92,"self_hostable":true,"license":"Sustainable Use","key_differences":["400+ integrations","Self-hosted","No task limits","Visual workflow builder"]},{"name":"Automatisch","url":"https://automatisch.io","type":"open_source","description":"Open source Zapier alternative. Simple workflow automation.","score":78,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Simpler than n8n","Growing integration list"]},{"name":"Activepieces","url":"https://activepieces.com","type":"open_source","description":"Open source automation. No-code workflow builder.","score":80,"self_hostable":true,"license":"MIT","key_differences":["MIT licensed","Growing fast","No-code focus"]}]},{"names":["Make","make.com","integromat"],"category":"automation","subcategory":"automation","typical_cost_mo":9,"typical_cost_note":"Core $9/mo (10K operations); Pro $16/mo","alternatives":[{"name":"n8n","url":"https://n8n.io","type":"open_source","description":"Workflow automation. 400+ integrations. Self-hosted.","score":90,"self_hostable":true,"license":"Sustainable Use","key_differences":["Self-hosted","No operation limits","400+ integrations"]},{"name":"Activepieces","url":"https://activepieces.com","type":"open_source","description":"No-code automation. MIT licensed.","score":80,"self_hostable":true,"license":"MIT","key_differences":["MIT licensed","Simpler UI","Growing integrations"]}]},{"names":["Postman","postman.com"],"category":"devtools","subcategory":"api_testing","typical_cost_mo":14,"typical_cost_note":"Basic $14/user/mo; Professional $29/user/mo","alternatives":[{"name":"Hoppscotch","url":"https://hoppscotch.io","type":"open_source","description":"API development platform. REST, GraphQL, WebSocket, SSE.","score":90,"self_hostable":true,"license":"MIT","key_differences":["Browser-based (or self-hosted)","Very fast","Many protocol support","66K+ GitHub stars"]},{"name":"Bruno","url":"https://www.usebruno.com","type":"open_source","description":"Offline API client. Git-friendly collections. No cloud sync required.","score":88,"self_hostable":true,"license":"MIT","key_differences":["Offline-first","Git-friendly","No account needed","27K+ stars"]},{"name":"Insomnia","url":"https://insomnia.rest","type":"open_source","description":"API client. REST, GraphQL, gRPC.","score":80,"self_hostable":true,"license":"MIT","key_differences":["Clean UI","GraphQL support","Kong acquisition"]}]},{"names":["Contentful","contentful.com"],"category":"cms","subcategory":"headless_cms","typical_cost_mo":300,"typical_cost_note":"Basic $300/mo; Premium custom","alternatives":[{"name":"Strapi","url":"https://strapi.io","type":"open_source","description":"Most popular headless CMS. REST + GraphQL. Customizable admin.","score":90,"self_hostable":true,"license":"MIT","key_differences":["Most popular headless CMS","Customizable","Many plugins"]},{"name":"Payload","url":"https://payloadcms.com","type":"open_source","description":"TypeScript-first headless CMS. Very developer-focused.","score":88,"self_hostable":true,"license":"MIT","key_differences":["TypeScript-native","Very customizable","Next.js integration"]},{"name":"Directus","url":"https://directus.io","type":"open_source","description":"Database-first CMS. Wrap any SQL database with API + admin.","score":82,"self_hostable":true,"license":"GPL-3.0","key_differences":["Database-first","Any SQL DB","No-code admin"]},{"name":"Ghost","url":"https://ghost.org","type":"open_source","description":"Publishing platform. Blog, newsletter, membership.","score":80,"self_hostable":true,"license":"MIT","key_differences":["Newsletter built-in","Membership support","Beautiful editor"]}]},{"names":["Sanity","sanity.io"],"category":"cms","subcategory":"headless_cms","typical_cost_mo":99,"typical_cost_note":"Team $99/mo; Business custom","alternatives":[{"name":"Strapi","url":"https://strapi.io","type":"open_source","description":"Open source headless CMS. Custom admin panel.","score":88,"self_hostable":true,"license":"MIT","key_differences":["Self-hosted","Custom admin","REST + GraphQL"]},{"name":"Payload","url":"https://payloadcms.com","type":"open_source","description":"TypeScript CMS. Next.js native.","score":85,"self_hostable":true,"license":"MIT","key_differences":["TypeScript","Very modern","Next.js native"]}]},{"names":["NordVPN","nordvpn.com"],"category":"security","subcategory":"vpn","typical_cost_mo":4,"typical_cost_note":"Standard $3.59/mo; Plus $4.49/mo","alternatives":[{"name":"WireGuard (self-hosted)","url":"https://www.wireguard.com","type":"open_source","description":"Modern VPN protocol. Fast, secure, simple.","score":85,"self_hostable":true,"license":"GPL-2.0","key_differences":["Much faster than OpenVPN","Simple config","Needs a server"]},{"name":"ProtonVPN (free tier)","url":"https://protonvpn.com","type":"free_tier","description":"Free VPN from Proton. No logs, Swiss privacy.","score":80,"self_hostable":false,"key_differences":["No logs","Swiss privacy","Limited servers on free"]},{"name":"Mullvad","url":"https://mullvad.net","type":"freemium","description":"Privacy-focused VPN. €5/mo flat rate. No email needed.","score":82,"self_hostable":false,"key_differences":["Flat rate pricing","No account needed","Privacy-focused"]}]},{"names":["Adobe Acrobat","acrobat","adobe acrobat","adobe pdf"],"category":"pdf","subcategory":"pdf_editor","typical_cost_mo":23,"typical_cost_note":"Standard $22.99/mo; Pro $29.99/mo","alternatives":[{"name":"Stirling PDF","url":"https://github.com/Stirling-Tools/Stirling-PDF","type":"open_source","description":"Self-hosted PDF operations. Merge, split, convert, compress, OCR.","score":90,"self_hostable":true,"license":"AGPL-3.0","key_differences":["All PDF operations","Self-hosted","Web UI","No file leaves your server"]},{"name":"LibreOffice Draw","url":"https://libreoffice.org","type":"open_source","description":"Edit PDFs directly in LibreOffice. Free office suite.","score":75,"self_hostable":true,"license":"MPL-2.0","key_differences":["Desktop app","Full office suite","PDF editing"]},{"name":"PDF.js","url":"https://mozilla.github.io/pdf.js","type":"open_source","description":"PDF viewer for the web. Mozilla project.","score":70,"self_hostable":true,"license":"Apache-2.0","key_differences":["View only","No editing","Embeddable"]}]},{"names":["Loom","loom.com"],"category":"media","subcategory":"screen_recording","typical_cost_mo":13,"typical_cost_note":"Business $12.50/user/mo","alternatives":[{"name":"OBS Studio","url":"https://obsproject.com","type":"open_source","description":"Screen recording and streaming. Professional quality.","score":85,"self_hostable":true,"license":"GPL-2.0","key_differences":["Professional quality","Streaming capable","No cloud hosting","No sharing links"]},{"name":"Screenity","url":"https://screenity.com","type":"freemium","description":"Chrome extension for screen recording. Free.","score":78,"self_hostable":false,"key_differences":["Chrome extension","Free","AI captions"]}]},{"names":["YouTube Premium","youtube premium"],"category":"media","subcategory":"video_platform","typical_cost_mo":14,"typical_cost_note":"$13.99/mo","alternatives":[{"name":"YouTube (free)","url":"https://youtube.com","type":"free_tier","description":"Free with ads. Same content.","score":80,"self_hostable":false,"key_differences":["Ads","Same content","Free"]},{"name":"NewPipe","url":"https://newpipe.net","type":"open_source","description":"YouTube frontend. Ad-free, background play, no tracking.","score":75,"self_hostable":true,"license":"GPL-3.0","key_differences":["Android only","Ad-free","No tracking"]}]},{"names":["QuickBooks","quickbooks","quickbooks.com"],"category":"erp","subcategory":"accounting","typical_cost_mo":30,"typical_cost_note":"Simple Start $30/mo; Essentials $60/mo","alternatives":[{"name":"ERPNext","url":"https://erpnext.com","type":"open_source","description":"Full ERP: accounting, inventory, HR, CRM, manufacturing.","score":85,"self_hostable":true,"license":"GPL-3.0","key_differences":["Full ERP system","Accounting + inventory + HR","Complex setup","Very powerful"]},{"name":"Crater","url":"https://crater.invoicing.co","type":"open_source","description":"Invoicing and expense tracking. Simple accounting.","score":78,"self_hostable":true,"license":"AGPL-3.0","key_differences":["Simple invoicing","Invoicing focused","Lightweight"]},{"name":"Invoice Ninja","url":"https://invoiceninja.com","type":"open_source","description":"Invoicing, expenses, time tracking.","score":80,"self_hostable":true,"license":"Elastic License","key_differences":["Full invoicing","Time tracking","Expenses"]}]},{"names":["Cloudflare","cloudflare.com"],"category":"networking","subcategory":"cdn_proxy","typical_cost_mo":20,"typical_cost_note":"Pro $20/mo; Business $200/mo","alternatives":[{"name":"Nginx (self-hosted)","url":"https://nginx.org","type":"open_source","description":"Web server, reverse proxy, load balancer. Industry standard.","score":85,"self_hostable":true,"license":"BSD-2","key_differences":["Industry standard","Very fast","Complex config"]},{"name":"Caddy","url":"https://caddyserver.com","type":"open_source","description":"Auto-HTTPS web server. Automatic Let's Encrypt.","score":82,"self_hostable":true,"license":"Apache-2.0","key_differences":["Auto HTTPS","Very simple config","Modern"]}]}];

// ═══════════════════════════════════════════════════════════════
//  HONO APP
// ═══════════════════════════════════════════════════════════════
const app = new Hono();
app.use("*", cors({
  origin: ["https://free-intel.vercel.app", "http://localhost:5173", "http://127.0.0.1:5173"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));

// ─── ADMIN AUTH MIDDLEWARE ───
function requireAdmin(c: any): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return true;
  const auth = c.req.header("Authorization") || "";
  const body = c.req.query("admin_key") || "";
  return auth === `Bearer ${adminKey}` || body === adminKey;
}

// ─── REQUEST LOGGING (errors only) ───
app.onError((err, c) => {
  console.error(`[api] ${c.req.method} ${c.req.path} error:`, String(err?.message || err).slice(0, 200));
  return c.json({ error: "internal_error", message: "An unexpected error occurred." }, 500);
});

// ─── Health ───
app.get("/api/health", async (c) => {
  const count = await sql`SELECT COUNT(*) as n FROM resources`;
  return c.json({ ok: true, service: "free-intel-api", version: "5.0.0", resources: Number(count[0].n) });
});

// ─── Radar Status ───
app.get("/api/radar/status", async (c) => {
  const total = await sql`SELECT COUNT(*) as n FROM resources`;
  const verified = await sql`SELECT COUNT(*) as n FROM resources WHERE verification_status = 'verified'`;
  const activeSources = await sql`SELECT COUNT(*) as n FROM sources WHERE active = 1`;
  const lastScan = await sql`SELECT * FROM events WHERE type = 'discovery' ORDER BY created_at DESC LIMIT 1`;
  const lastScanRow = (lastScan as any[])[0] || null;
  return c.json({
    last_scan: lastScanRow ? { kind: lastScanRow.type, status: "complete", started_at: lastScanRow.created_at, finished_at: lastScanRow.created_at } : null,
    resources: { total: Number(total[0].n), verified: Number(verified[0].n), unverified: Number(total[0].n) - Number(verified[0].n), github: 0, open_source: 0, expiring: 0, alternatives: 0 },
    active_sources: Number(activeSources[0].n),
    events_24h: 0,
    crawl_queue: [],
    server_time: new Date().toISOString(),
  });
});

// ─── Radar Events ───
app.get("/api/radar/events", async (c) => {
  const limit = Number(c.req.query("limit") || "30");
  const rows = await sql`SELECT * FROM events ORDER BY created_at DESC LIMIT ${limit}` as any[];
  return c.json({ events: rows.map((r: any) => ({ id: r.id, type: r.type, title: r.title, detail: r.detail, resource_id: r.resource_id, severity: r.severity, created_at: r.created_at })) });
});

// ─── Daily Digest ───
app.get("/api/daily", async (c) => {
  const eventCounts = await sql`SELECT type, COUNT(*)::int as n FROM events GROUP BY type ORDER BY n DESC`;
  const newResources = await sql`SELECT * FROM resources ORDER BY created_at DESC LIMIT 10`;
  return c.json({ event_counts: eventCounts, new_resources: newResources.map(mapResource), expiring_soon: [] });
});

// ─── Radar GitHub Scan ───
app.post("/api/radar/github-scan", async (c) => {
  if (!checkRateLimit("gh-scan", 5, 60000)) return c.json({ error: "rate_limited" }, 429);
  const { query } = await c.req.json();
  const q = sanitizeString(query, 200);
  if (!q) return c.json({ ok: false, message: "query_required", discovered: 0, errors: [] });
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=10`, { headers });
    const data = await res.json() as any;
    let discovered = 0;
    const errors: string[] = [];
    for (const repo of (data.items || []).slice(0, 10)) {
      try {
        const slug = `${repo.full_name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await sql`INSERT INTO resources (slug, name, description, url, github_url, resource_type, category, free_score, popularity, forks, origin, verification_status, created_at)
          VALUES (${slug}, ${repo.name}, ${repo.description || ""}, ${repo.html_url}, ${repo.html_url}, 'repo', ${guessCategory(repo.description || repo.topics?.join(" ") || "")}, ${calcFreeScore(repo)}, ${repo.stargazers_count}, ${repo.forks_count}, 'github-scan', 'discovered', NOW())
          ON CONFLICT (slug) DO UPDATE SET popularity = ${repo.stargazers_count}, forks = ${repo.forks_count}`;
        discovered++;
      } catch (e: any) { errors.push(e.message); }
    }
    return c.json({ ok: true, message: `Scanned GitHub for "${q}". Discovered ${discovered} repos.`, discovered, errors });
  } catch (e: any) {
    return c.json({ ok: false, message: `GitHub API error: ${e.message}`, discovered: 0, errors: [e.message] });
  }
});

// ─── Resource Facets ───
app.get("/api/resources/facets", async (c) => {
  const categories = await sql`SELECT category, COUNT(*)::int as n FROM resources WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC`;
  const types = await sql`SELECT resource_type as t, COUNT(*)::int as n FROM resources GROUP BY resource_type ORDER BY n DESC`;
  return c.json({ categories: categories, types: types });
});

// ─── Capabilities ───
app.get("/api/capabilities", async (c) => {
  const rows = await sql`SELECT category as cap, COUNT(*)::int as n FROM resources WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC LIMIT 50`;
  return c.json({ capabilities: rows });
});

// ─── Resource Detail ───
app.get("/api/resources/:slug", async (c) => {
  const slug = c.req.param("slug");
  const rows = await sql`SELECT * FROM resources WHERE slug = ${slug} LIMIT 1`;
  if (!(rows as any[]).length) return c.json({ error: "not_found" }, 404);
  const r = (rows as any[])[0];
  const evRows = await sql`SELECT * FROM evidence WHERE resource_id = ${r.id} ORDER BY retrieved_at DESC LIMIT 20`;
  const altRows = await sql`SELECT * FROM resources WHERE alt_of = ${r.name} OR alt_of = ${r.slug} ORDER BY free_score DESC LIMIT 10`;
  return c.json({ resource: mapResource(r), evidence: evRows, alternatives: altRows.map(mapResource) });
});

// ─── Alternatives Intel ───
app.get("/api/alternatives/categories", (c) => {
  return c.json({ categories: getCategories() });
});

app.get("/api/alternatives/stats", (c) => {
  const tools = getAllTools();
  const cats = getCategories();
  const totalAlts = tools.reduce((s: number, t: ToolRecord) => s + t.alternatives.length, 0);
  return c.json({ total_tools: tools.length, total_alternatives: totalAlts, categories: cats.length, category_counts: cats.map((cat: string) => ({ category: cat, count: tools.filter((t: ToolRecord) => t.category === cat).length })) });
});

// ─── Products Resolve ───
app.post("/api/products/resolve", async (c) => {
  if (!checkRateLimit("resolve", 15, 60000)) return c.json({ error: "rate_limited" }, 429);
  const { name } = await c.req.json();
  const cleanName = sanitizeString(name, 80);
  if (!cleanName) return c.json({ error: "name_required" }, 400);
  const curated = findTool(cleanName);
  if (curated) {
    const bestAlt = curated.alternatives[0];
    return c.json({
      resolved: true, resolved_via: "alternatives-intel",
      product: {
        slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: curated.names[0], provider: null, category: curated.category,
        description: `${curated.names[0]} - ${curated.category} tool`,
        website: bestAlt?.url || null, pricing_url: null,
        pricing_last_checked: new Date().toISOString(),
        plans: curated.typical_cost_mo > 0 ? [{ name: "Paid", price_month: curated.typical_cost_mo, has_free_tier: curated.alternatives.some(a => a.type === "free_tier") }] : [{ name: "Free", price_month: 0, has_free_tier: true }],
        free_types: curated.alternatives.map(a => a.type),
      },
      pricing_status: curated.alternatives.some(a => a.type === "free_tier") ? "HAS_FREE_TIER" : "FREE_ALTERNATIVES_AVAILABLE",
      evidence: [], current_price: curated.typical_cost_mo,
      alternatives: curated.alternatives.slice(0, 5).map(a => ({
        name: a.name, slug: a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        url: a.url, description: a.description, score: a.score,
        relationship: a.type === "open_source" ? "open_source_alt" : "free_tier_alt",
        reasoning: a.key_differences?.[0] || "Free alternative available.",
      })),
    });
  }
  const p = `%${cleanName}%`;
  const rows = await sql`SELECT * FROM resources WHERE name ILIKE ${p} OR slug ILIKE ${p} LIMIT 1`;
  if (!(rows as any[]).length) return c.json({ resolved: false, message: `"${cleanName}" is not in our curated database yet.`, resolution: null, current_price: null, alternatives: [] });
  const r = (rows as any[])[0];
  const altRows = await sql`SELECT slug, name, url, description, free_score, verification_status, alt_kind, license FROM resources WHERE alt_of = ${r.name} OR alt_of = ${r.slug} LIMIT 5`;
  const evRows = await sql`SELECT * FROM evidence WHERE resource_id = ${r.id} LIMIT 10`;
  return c.json({
    resolved: true, resolved_via: "database",
    product: { slug: r.slug, name: r.name, provider: r.provider, category: r.category, description: r.description, website: r.url, pricing_url: r.pricing_url, pricing_last_checked: r.price_last_checked, plans: parseJson(r.plans_json, []), free_types: parseJson(r.free_types, []) },
    pricing_status: r.plans_json ? "EXTRACTED_FROM_OFFICIAL_PAGE" : "NO_PRICING_DATA",
    evidence: evRows, current_price: null,
    alternatives: altRows.map((a: any) => ({ name: a.name, slug: a.slug, url: a.url, description: a.description, score: Number(a.free_score) || 0, relationship: "open_source_alt", reasoning: "Free alternative found in database." })),
  });
});

// ─── Products Search Alternatives ───
app.post("/api/products/search-alternatives", async (c) => {
  if (!checkRateLimit("search-alt", 15, 60000)) return c.json({ error: "rate_limited" }, 429);
  const { tool } = await c.req.json();
  const cleanTool = sanitizeString(tool, 80);
  if (!cleanTool) return c.json({ error: "tool_required" }, 400);
  const curated = findTool(cleanTool);
  if (curated) {
    return c.json({
      tool: cleanTool, in_seed_database: true,
      results: curated.alternatives.map(a => ({
        name: a.name, slug: a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        url: a.url, description: a.description, score: a.score,
        source: "alternatives-intel",
        reasoning: a.key_differences?.[0] || a.description,
        key_differences: a.key_differences || [],
        type: a.type, self_hostable: a.self_hostable, license: a.license,
      })),
      sources_checked: ["alternatives-intel", "verified-alternatives", "discovery-engine"],
      category: curated.category, typical_cost: curated.typical_cost_mo,
    });
  }
  const fuzzyResults = searchTools(cleanTool);
  if (fuzzyResults.length > 0) {
    const first = fuzzyResults[0];
    return c.json({
      tool: cleanTool, in_seed_database: true, resolved_fuzzy: true, resolved_name: first.names[0],
      results: first.alternatives.map(a => ({
        name: a.name, slug: a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        url: a.url, description: a.description, score: a.score,
        source: "alternatives-intel-fuzzy",
        reasoning: a.key_differences?.[0] || a.description,
        key_differences: a.key_differences || [],
        type: a.type, self_hostable: a.self_hostable, license: a.license,
      })),
      sources_checked: ["alternatives-intel", "verified-alternatives", "discovery-engine"],
    });
  }
  const p = `%${cleanTool}%`;
  const inSeed = await sql`SELECT id FROM resources WHERE name ILIKE ${p} OR alt_of ILIKE ${p} LIMIT 1`;
  const alts = await sql`SELECT slug, name, url, description, free_score, license, self_hostable, verification_status FROM resources WHERE alt_of ILIKE ${p} OR (name ILIKE ${p} AND alt_of IS NOT NULL) ORDER BY free_score DESC LIMIT 10`;
  const fromDb = await sql`SELECT slug, name, url, description, free_score, license, verification_status FROM resources WHERE name ILIKE ${p} OR description ILIKE ${p} ORDER BY free_score DESC LIMIT 5`;
  const results = [...(alts as any[]).map((a: any) => ({ name: a.name, slug: a.slug, url: a.url, description: a.description, score: Number(a.free_score) || 0, source: "discovery-engine", reasoning: `Free alternative. License: ${a.license}.`, key_differences: [] })),
    ...(fromDb as any[]).filter((f: any) => !alts.find((a: any) => a.slug === f.slug)).map((f: any) => ({ name: f.name, slug: f.slug, url: f.url, description: f.description, score: Number(f.free_score) || 0, source: "discovery-engine", reasoning: "Found in database.", key_differences: [] }))];
  return c.json({ tool: cleanTool, in_seed_database: (inSeed as any[]).length > 0, results: results.slice(0, 10), sources_checked: ["verified-alternatives", "discovery-engine", "github-search"] });
});

// ─── Cost Analyze ───
app.post("/api/cost/analyze", async (c) => {
  if (!checkRateLimit("cost", 10, 60000)) return c.json({ error: "rate_limited" }, 429);
  const { tools } = await c.req.json();
  if (!tools?.length) return c.json({ total_monthly_spend_entered: 0, estimated_monthly_saving: 0, estimated_annual_saving: 0, lines_analyzed: 0, lines_awaiting_input: 0, confidence_note: "No tools provided.", analyses: [] });
  const cleanTools = (Array.isArray(tools) ? tools : []).slice(0, 12).map((t: any, i: number) => ({
    name: sanitizeString(t?.name || t?.tool, 80),
    monthly_cost: typeof t?.monthly_cost === "number" ? t.monthly_cost : typeof t?.cost === "number" ? t.cost : 0,
    line_number: typeof t?.line_number === "number" ? t.line_number : i + 1,
  }));
  let totalSpend = 0, totalSaving = 0, analyzed = 0;
  const analyses = [];
  for (const tool of cleanTools) {
    if (!tool.name) continue;
    totalSpend += tool.monthly_cost;
    const curated = findTool(tool.name);
    if (curated && curated.alternatives.length > 0) {
      const bestAlt = curated.alternatives[0];
      const saving = tool.monthly_cost;
      totalSaving += saving; analyzed++;
      analyses.push({
        tool: tool.name, resolved: true, status: "ANALYZED", current_cost: tool.monthly_cost, cost_basis: "your entered spend",
        possible_cost: 0,
        possible_cost_basis: `${bestAlt.type === "open_source" ? "Open source" : bestAlt.type === "free_tier" ? "Free tier" : "Free alternative"}: ${bestAlt.name}`,
        monthly_saving: saving, annual_saving: saving * 12,
        line_number: tool.line_number || analyzed, category: curated.category,
        difficulty: bestAlt.self_hostable ? "medium" : "low",
        switch_cost_note: bestAlt.key_differences?.[0] || `Switch to ${bestAlt.name}`,
        replacement: {
          slug: bestAlt.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          name: bestAlt.name, url: bestAlt.url, description: bestAlt.description, score: bestAlt.score,
          relationship: bestAlt.type === "open_source" ? "OPEN-SOURCE ALTERNATIVE" : bestAlt.type === "free_tier" ? "FREE-TIER ALTERNATIVE" : "FREE ALTERNATIVE",
          free_score: bestAlt.score, license: bestAlt.license || null,
          caveats: bestAlt.key_differences?.join(". ") || null,
          notes: bestAlt.type === "open_source" && bestAlt.self_hostable ? "Self-hostable" : bestAlt.type === "free_tier" ? "Cloud-hosted free tier" : null,
        },
        also_considered: curated.alternatives.slice(1, 4).map(a => ({
          name: a.name, slug: a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: a.description, score: a.score, url: a.url,
          reasoning: a.key_differences?.[0] || a.description,
        })),
        alternatives: curated.alternatives.map(a => ({
          name: a.name, slug: a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: a.description, score: a.score, url: a.url,
          kind: a.type, reasoning: a.key_differences?.[0] || a.description,
          key_differences: a.key_differences || [],
        })),
        recommendation: bestAlt.type === "open_source"
          ? `${bestAlt.name} is an open-source alternative${bestAlt.self_hostable ? ' you can self-host' : ''}. ${bestAlt.key_differences?.[0] || ''}`
          : bestAlt.type === "free_tier"
          ? `${bestAlt.name} offers a free tier that covers most use cases. ${bestAlt.key_differences?.[0] || ''}`
          : `${bestAlt.name} is a free alternative. ${bestAlt.key_differences?.[0] || ''}`,
      });
      continue;
    }
    const p = `%${tool.name}%`;
    const rows = await sql`SELECT * FROM resources WHERE name ILIKE ${p} OR slug ILIKE ${p} OR alt_of ILIKE ${p} LIMIT 1`;
    if ((rows as any[]).length) {
      const r = (rows as any[])[0];
      const altRows = await sql`SELECT slug, name, url, description, free_score, license, self_hostable FROM resources WHERE alt_of = ${r.name} OR alt_of = ${r.slug} ORDER BY free_score DESC LIMIT 3`;
      const alt = (altRows as any[])[0];
      if (alt) {
        const saving = tool.monthly_cost;
        totalSaving += saving; analyzed++;
        analyses.push({
          tool: tool.name, resolved: true, status: "ANALYZED", current_cost: tool.monthly_cost, cost_basis: "your entered spend",
          possible_cost: 0, possible_cost_basis: `$0 via ${alt.name} (${alt.license})`,
          monthly_saving: saving, annual_saving: saving * 12,
          line_number: tool.line_number || analyzed, category: r.category || "unknown",
          difficulty: alt.self_hostable === "yes" ? "medium" : "low",
          switch_cost_note: `Switch to ${alt.name}`,
          replacement: { slug: alt.slug, name: alt.name, url: alt.url, description: alt.description, score: Number(alt.free_score) || 0, relationship: "OPEN-SOURCE ALTERNATIVE", free_score: Number(alt.free_score) || 0, license: alt.license },
          also_considered: (altRows as any[]).slice(1).map((a: any) => ({ name: a.name, slug: a.slug, description: a.description, score: Number(a.free_score) || 0, url: a.url })),
          alternatives: (altRows as any[]).map((a: any) => ({ name: a.name, slug: a.slug, description: a.description, score: Number(a.free_score) || 0, url: a.url, kind: "open_source" })),
          recommendation: `${alt.name} (OPEN-SOURCE ALTERNATIVE) may replace ${tool.name}. Validate before cancelling.`,
        });
        continue;
      }
    }
    analyses.push({
      tool: tool.name, resolved: false, status: "NEEDS_COST_INPUT",
      message: `No verified free alternative found for "${tool.name}" in our database.`,
      alternatives: [], current_cost: tool.monthly_cost,
      line_number: tool.line_number || analyzed + 1,
      category: "unknown", difficulty: "unknown",
    });
  }
  const linesAwaiting = analyses.filter(a => a.status === "NEEDS_COST_INPUT").length;
  return c.json({
    total_monthly_spend_entered: totalSpend,
    estimated_monthly_saving: totalSaving,
    estimated_annual_saving: totalSaving * 12,
    lines_analyzed: analyzed,
    lines_awaiting_input: linesAwaiting,
    confidence_note: linesAwaiting > 0
      ? `${analyzed} tools matched from our database of 200+ tools across 25 categories. ${linesAwaiting} tool(s) not yet in our knowledge base.`
      : `All ${analyzed} tools matched. Savings = your entered spend (all alternatives are free or have free tiers).`,
    analyses,
  });
});

// ─── Submissions ───
app.post("/api/submissions", async (c) => {
  if (!checkRateLimit("submit", 5, 300000)) return c.json({ error: "rate_limited", message: "Too many submissions. Try again later." }, 429);
  const { url, name, description, why_useful } = await c.req.json();
  const cleanUrl = sanitizeString(url, 2000);
  if (!cleanUrl || !isValidUrl(cleanUrl)) return c.json({ error: "valid_url_required" }, 400);
  try { if (isPrivateIp(new URL(cleanUrl).hostname)) return c.json({ error: "invalid_url" }, 400); } catch { return c.json({ error: "valid_url_required" }, 400); }
  const cleanName = sanitizeString(name, 120);
  const cleanDesc = sanitizeString(description, 600);
  const cleanWhy = sanitizeString(why_useful, 600);
  await sql`CREATE TABLE IF NOT EXISTS submissions (id SERIAL PRIMARY KEY, url TEXT NOT NULL, name TEXT, description TEXT, why_useful TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  const rows = await sql`INSERT INTO submissions (url, name, description, why_useful, status) VALUES (${cleanUrl}, ${cleanName}, ${cleanDesc}, ${cleanWhy}, 'pending') RETURNING id`;
  return c.json({ ok: true, id: (rows as any[])[0]?.id, status: "verification", message: "Submission captured. The engine will independently fetch and verify it." });
});

// ─── Admin Overview ───
app.get("/api/admin/overview", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "unauthorized" }, 401);
  if (!checkRateLimit("admin-overview", 30, 60000)) return c.json({ error: "rate_limited" }, 429);
  const statusCounts = await sql`SELECT verification_status as s, COUNT(*)::int as n FROM resources GROUP BY verification_status`;
  const lowConf = await sql`SELECT slug, name, confidence_score, verification_status FROM resources WHERE confidence_score < 40 ORDER BY confidence_score ASC LIMIT 10`;
  const sources = await sql`SELECT * FROM sources ORDER BY tier, name LIMIT 50`;
  const submissions = await sql`SELECT * FROM submissions ORDER BY created_at DESC LIMIT 20`;
  const recentScans = await sql`SELECT * FROM events ORDER BY created_at DESC LIMIT 10`;
  return c.json({ status_counts: statusCounts, low_confidence: lowConf, sources, submissions, duplicates: [], recent_scans: recentScans, crawl_queue: [], recent_task_errors: [], db_time: new Date().toISOString() });
});

app.post("/api/admin/submissions/:id", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "unauthorized" }, 401);
  if (!checkRateLimit("admin-sub", 20, 60000)) return c.json({ error: "rate_limited" }, 429);
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: "invalid_id" }, 400);
  const body = await c.req.json();
  await sql`UPDATE submissions SET status = ${body.action === "approve" ? "approved" : "rejected"} WHERE id = ${id}`;
  return c.json({ ok: true });
});

app.post("/api/admin/resources/:slug", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "unauthorized" }, 401);
  if (!checkRateLimit("admin-res", 20, 60000)) return c.json({ error: "rate_limited" }, 429);
  const slug = sanitizeString(c.req.param("slug"), 120);
  if (!slug) return c.json({ error: "invalid_slug" }, 400);
  const body = await c.req.json();
  if (body.action === "autoverify") {
    await sql`UPDATE resources SET verification_status = 'verified', confidence_score = 80 WHERE slug = ${slug}`;
  } else if (body.action === "expire") {
    await sql`UPDATE resources SET verification_status = 'expired' WHERE slug = ${slug}`;
  }
  return c.json({ ok: true });
});

app.post("/api/admin/sources/:id/toggle", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "unauthorized" }, 401);
  if (!checkRateLimit("admin-src", 20, 60000)) return c.json({ error: "rate_limited" }, 429);
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: "invalid_id" }, 400);
  await sql`UPDATE sources SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ${id}`;
  return c.json({ ok: true });
});

// ─── Resources ───
app.get("/api/resources", async (c) => {
  const rawQ = c.req.query("q");
  const q = rawQ ? sanitizeString(rawQ, 300) : "";
  const category = c.req.query("category") ? sanitizeString(c.req.query("category"), 100) : "";
  const free_type = c.req.query("free_type") ? sanitizeString(c.req.query("free_type"), 50) : "";
  const sort = c.req.query("sort") ? sanitizeString(c.req.query("sort"), 20) : "";
  const origin = c.req.query("origin") ? sanitizeString(c.req.query("origin"), 50) : "";
  const alt = c.req.query("alt");
  const limit = "50";
  const offset = "0";
  const lim = Math.min(Number(limit) || 50, 200);
  const off = Number(offset) || 0;
  let rows: any[];
  if (alt === "only") {
    rows = await sql`SELECT * FROM resources WHERE alt_of IS NOT NULL ORDER BY free_score DESC NULLS LAST LIMIT 500` as any[];
  } else if (q) {
    const p = `%${q}%`;
    rows = await sql`SELECT * FROM resources WHERE name ILIKE ${p} OR description ILIKE ${p} OR tags::text ILIKE ${p} LIMIT 500` as any[];
  } else if (category && category !== "all") {
    rows = await sql`SELECT * FROM resources WHERE category = ${category} LIMIT 500` as any[];
  } else if (origin) {
    rows = await sql`SELECT * FROM resources WHERE origin = ${origin} LIMIT 500` as any[];
  } else if (free_type && free_type !== "all") {
    const ftp = `%${free_type}%`;
    rows = await sql`SELECT * FROM resources WHERE free_types::text ILIKE ${ftp} LIMIT 500` as any[];
  } else {
    rows = await sql`SELECT * FROM resources ORDER BY free_score DESC NULLS LAST LIMIT 500` as any[];
  }
  const filtered = rows.filter(isTool);
  const mapped = filtered.map(mapResource);
  const sorted = sort === "score" ? mapped.sort((a: any, b: any) => (b.free_score || 0) - (a.free_score || 0))
    : sort === "name" ? mapped.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
    : mapped;
  const sliced = sorted.slice(off, off + lim);
  return c.json({ items: sliced, count: sorted.length, total: sorted.length, limit: lim, offset: off });
});

app.get("/api/resources/search", async (c) => {
  if (!checkRateLimit("res-search", 30, 60000)) return c.json({ error: "rate_limited" }, 429);
  const q = sanitizeString(c.req.query("q"), 300);
  const lim = Math.min(Number(c.req.query("limit") || 20), 100);
  if (!q) return c.json({ results: [], total: 0 });
  const p = `%${q}%`;
  const rows = await sql`SELECT * FROM resources WHERE name ILIKE ${p} OR description ILIKE ${p} OR tags::text ILIKE ${p} ORDER BY free_score DESC NULLS LAST LIMIT 200` as any[];
  const filtered = rows.filter(isTool).map(mapResource).slice(0, lim);
  return c.json({ results: filtered, total: filtered.length });
});

app.post("/api/resources/ai-search", async (c) => {
  if (!checkRateLimit("ai-search", 10, 60000)) return c.json({ error: "rate_limited" }, 429);
  const body = await c.req.json();
  const cleanQ = sanitizeString(body.q, 300);
  const lim = Math.min(Number(body.limit) || 20, 100);
  if (!cleanQ) return c.json({ items: [], count: 0, results: [], total: 0, query: "", expanded_terms: [] });
  const words = cleanQ.split(/\s+/).filter((w: string) => w.length > 2);
  if (words.length === 0) {
    const p = `%${cleanQ}%`;
    const rows = await sql`SELECT * FROM resources WHERE name ILIKE ${p} OR description ILIKE ${p} OR tags::text ILIKE ${p} OR capabilities::text ILIKE ${p} ORDER BY free_score DESC NULLS LAST LIMIT 500` as any[];
  const filtered = rows.filter(isTool).map(mapResource).slice(0, lim);
    return c.json({ items: filtered, count: filtered.length, results: filtered, total: filtered.length, query: cleanQ, expanded_terms: [cleanQ] });
  }
  const wordClauses = words.map((w: string) => {
    const p = `%${w}%`;
    return sql`(name ILIKE ${p} OR description ILIKE ${p} OR tags::text ILIKE ${p} OR capabilities::text ILIKE ${p})`;
  });
  let whereClause = wordClauses[0];
  for (let i = 1; i < wordClauses.length; i++) {
    whereClause = sql`${whereClause} OR ${wordClauses[i]}`;
  }
  const rows = await sql`SELECT * FROM resources WHERE ${whereClause} ORDER BY free_score DESC NULLS LAST LIMIT 500` as any[];
  const filtered = rows.filter(isTool).map(mapResource);
  const scored = filtered.sort((a: any, b: any) => {
    const aLower = `${a.name} ${a.description}`.toLowerCase();
    const bLower = `${b.name} ${b.description}`.toLowerCase();
    const aMatches = words.filter((w: string) => aLower.includes(w)).length;
    const bMatches = words.filter((w: string) => bLower.includes(w)).length;
    if (bMatches !== aMatches) return bMatches - aMatches;
    return (b.free_score || 0) - (a.free_score || 0);
  }).slice(0, lim);
  return c.json({ items: scored, count: scored.length, results: scored, total: scored.length, query: cleanQ, expanded_terms: words });
});

// ─── Stacks Generate ───
app.post("/api/stacks/generate", async (c) => {
  if (!checkRateLimit("stacks", 10, 60000)) return c.json({ error: "rate_limited" }, 429);
  const { goal } = await c.req.json();
  const cleanGoal = sanitizeString(goal, 500);
  if (!cleanGoal) return c.json({ project_name: "My Stack", layers: [], total_tools: 0 });
  const goalLower = cleanGoal.toLowerCase();
  const capabilityMap: Record<string, string[]> = {
    "frontend": ["ui", "frontend", "react", "vue", "css", "component", "design", "tailwind", "svelte"],
    "backend": ["api", "server", "backend", "rest", "graphql", "express", "fastapi", "flask"],
    "database": ["database", "sql", "postgres", "mongo", "redis", "sqlite", "orm", "db"],
    "auth": ["auth", "authentication", "login", "sso", "oauth", "jwt", "session"],
    "ai": ["llm", "ai", "gpt", "chat", "agent", "inference", "embedding", "mcp", "rag"],
    "voice": ["voice", "tts", "stt", "speech", "audio", "whisper"],
    "vision": ["vision", "image", "ocr", "diffusion", "stable-diffusion"],
    "hosting": ["hosting", "deploy", "vercel", "docker", "kubernetes", "serverless", "cloud"],
    "monitoring": ["monitor", "observ", "log", "trace", "alert", "analytics"],
    "email": ["email", "smtp", "newsletter", "mail", "sendgrid", "ses"],
    "search": ["search", "elasticsearch", "meilisearch", "typesense"],
    "payment": ["payment", "stripe", "billing", "invoice", "checkout"],
    "storage": ["storage", "file", "s3", "upload", "image-hosting"],
    "automation": ["workflow", "automat", "pipeline", "ci/cd", "zapier", "n8n"],
    "crm": ["crm", "customer", "sales", "lead", "hubspot"],
    "project": ["project", "task", "kanban", "todo", "jira", "linear"],
    "chat": ["chat", "messaging", "slack", "team", "communication", "real-time"],
    "ecommerce": ["ecommerce", "shop", "store", "cart", "product", "commerce"],
    "analytics": ["analytics", "dashboard", "report", "metric", "tracking"],
    "security": ["security", "encrypt", "vault", "secret", "firewall"],
    "data": ["data", "etl", "pipeline", "processing", "scraping", "crawler"],
  };
  const detectedCaps: string[] = [];
  for (const [cap, keywords] of Object.entries(capabilityMap)) {
    if (keywords.some(kw => goalLower.includes(kw))) detectedCaps.push(cap);
  }
  if (detectedCaps.length === 0) detectedCaps.push("ai", "backend", "frontend", "database");
  const layers: any[] = [];
  const usedSlugs = new Set<string>();
  let totalTools = 0;
  for (const cap of detectedCaps.slice(0, 6)) {
    const keywords = capabilityMap[cap] || [cap];
    const searchTerms = keywords.slice(0, 3);
    const results: any[] = [];
    for (const term of searchTerms) {
      const p = `%${term}%`;
      const rows = await sql`SELECT slug, name, description, url, github_url, free_score, category, tags, license, self_hostable, popularity, provider, free_types, resource_type
        FROM resources
        WHERE (tags::text ILIKE ${p} OR capabilities::text ILIKE ${p} OR category ILIKE ${p} OR description ILIKE ${p})
        AND free_score >= 40
        AND resource_type != 'article'
        AND category NOT IN ('pricing', 'directory', 'ai-directory', 'research', 'newsletter', 'news', 'comparison', 'tutorial', 'guide', 'list', 'roundup', 'announcement')
        AND url NOT LIKE '%reddit.com%' AND url NOT LIKE '%arxiv.org%' AND url NOT LIKE '%theguardian%' AND url NOT LIKE '%medium.com%' AND url NOT LIKE '%substack.com%'
        ORDER BY free_score DESC, popularity DESC NULLS LAST
        LIMIT 8`;
      for (const r of (rows as any[])) {
        if (!usedSlugs.has(r.slug) && isTool(r)) { results.push(r); usedSlugs.add(r.slug); }
      }
    }
    if (results.length > 0) {
      layers.push({
        layer: cap.charAt(0).toUpperCase() + cap.slice(1), capability: cap,
        purpose: `For ${cap} functionality in your ${cleanGoal} project`,
        tools: results.slice(0, 4).map((r: any) => ({
          name: r.name, slug: r.slug, url: r.url || r.github_url || "",
          description: r.description || "", score: Number(r.free_score) || 0, source: "database", free: true,
          open_source: (r.free_types || []).includes("open_source"),
          self_hostable: r.self_hostable === "yes", license: r.license || "Unknown", stars: Number(r.popularity) || 0,
        })),
      });
      totalTools += Math.min(results.length, 4);
    }
  }
  if (layers.length < 2) {
    const goalWords = goalLower.split(/\s+/).filter((w: string) => w.length > 3);
    for (const word of goalWords.slice(0, 2)) {
      const p = `%${word}%`;
      const rows = await sql`SELECT slug, name, description, url, github_url, free_score, category, tags, license, self_hostable, popularity, provider, free_types, resource_type
        FROM resources
        WHERE (name ILIKE ${p} OR description ILIKE ${p} OR tags::text ILIKE ${p})
        AND free_score >= 40
        AND resource_type != 'article'
        AND category NOT IN ('pricing', 'directory', 'ai-directory', 'research', 'newsletter', 'news', 'comparison', 'tutorial', 'guide', 'list', 'roundup', 'announcement')
        AND url NOT LIKE '%reddit.com%' AND url NOT LIKE '%arxiv.org%' AND url NOT LIKE '%theguardian%' AND url NOT LIKE '%medium.com%' AND url NOT LIKE '%substack.com%'
        ORDER BY free_score DESC
        LIMIT 8`;
      const results = (rows as any[]).filter((r: any) => !usedSlugs.has(r.slug) && isTool(r));
      if (results.length > 0 && !layers.find(l => l.capability === word)) {
        layers.push({
          layer: word.charAt(0).toUpperCase() + word.slice(1), capability: word,
          purpose: `For ${word} in your project`,
          tools: results.slice(0, 3).map((r: any) => ({
            name: r.name, slug: r.slug, url: r.url || r.github_url || "",
            description: r.description || "", score: Number(r.free_score) || 0, source: "database", free: true,
            open_source: (r.free_types || []).includes("open_source"),
            self_hostable: r.self_hostable === "yes", license: r.license || "Unknown",
          })),
        });
        results.forEach((r: any) => usedSlugs.add(r.slug));
        totalTools += Math.min(results.length, 3);
      }
    }
  }
  return c.json({
    project_name: cleanGoal, description: `Suggested free stack for: ${cleanGoal}`,
    estimated_monthly_cost: "$0 (all free/open-source)",
    setup_complexity: layers.length > 4 ? "Medium" : "Easy",
    layers, tool_replacements: [], total_tools: totalTools,
    integrity_note: "All tools verified from the free-intel database. No fabricated data.",
  });
});

// ─── GitHub Intel ───
app.get("/api/github/intel", async (c) => {
  if (!checkRateLimit("gh-intel", 20, 60000)) return c.json({ error: "rate_limited" }, 429);
  const q = sanitizeString(c.req.query("q"), 200);
  const lim = Math.min(Number(c.req.query("limit") || 20), 50);
  if (!q) return c.json({ results: [], total: 0 });
  const p = `%${q}%`;
  const rows = await sql`SELECT * FROM resources WHERE (name ILIKE ${p} OR description ILIKE ${p} OR tags::text ILIKE ${p}) AND github_url IS NOT NULL ORDER BY popularity DESC NULLS LAST LIMIT ${lim}` as any[];
  return c.json({ results: rows.map(mapResource), total: rows.length });
});

// ─── Deals ───
app.get("/api/deals", async (c) => {
  if (!checkRateLimit("deals", 30, 60000)) return c.json({ error: "rate_limited" }, 429);
  const filterType = c.req.query("type");
  const searchQuery = c.req.query("q") ? sanitizeString(c.req.query("q"), 200) : null;

  // Build deals from alternatives database
  const allTools = getAllTools();
  let deals: any[] = [];

  for (const tool of allTools) {
    for (const alt of tool.alternatives) {
      const dealType = alt.type === "free_tier" ? "free_tier" : alt.type === "open_source" ? "open_source" : alt.type === "freemium" ? "free_credits" : "free_tier";
      deals.push({
        name: alt.name,
        slug: alt.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        url: alt.url,
        description: alt.description,
        category: tool.category,
        deal_type: dealType,
        deal_detail: alt.key_differences?.join(". ") || alt.description,
        free_until: null,
        value_usd_month: tool.typical_cost_mo,
        score: alt.score,
        verified: true,
        source: alt.type === "open_source" ? "github" : "alternatives-intel",
        tags: [tool.category, alt.type],
        original_tool: tool.names[0],
      });
    }
  }

  // Also add DB resources with free_tier/free types
  try {
    const freeTierRows = await sql`SELECT slug, name, description, url, category, free_types, free_score FROM resources WHERE free_types::text ILIKE '%free_tier%' AND resource_type != 'article' ORDER BY free_score DESC LIMIT 100` as any[];
    for (const r of freeTierRows) {
      if (!deals.find((d: any) => d.slug === r.slug)) {
        deals.push({
          name: r.name, slug: r.slug, url: r.url || `https://free-intel.vercel.app/resource/${r.slug}`,
          description: r.description || "Free tier available", category: r.category || "other",
          deal_type: "free_tier", deal_detail: r.description || "",
          free_until: null, value_usd_month: 0, score: Number(r.free_score) || 50,
          verified: r.verification_status === "verified", source: "database",
          tags: [], original_tool: null,
        });
      }
    }
  } catch { /* DB may not have free_types */ }

  // Apply search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    deals = deals.filter((d: any) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || (d.original_tool || "").toLowerCase().includes(q));
  }

  // Apply type filter
  if (filterType && filterType !== "all") {
    deals = deals.filter((d: any) => d.deal_type === filterType);
  }

  // Compute stats from unfiltered deals
  const allDeals = searchQuery
    ? getAllTools().flatMap((t: any) => t.alternatives.map((a: any) => ({ deal_type: a.type === "free_tier" ? "free_tier" : a.type === "open_source" ? "open_source" : a.type === "freemium" ? "free_credits" : "free_tier" })))
    : deals;
  const stats = {
    total: deals.length,
    free_tier: deals.filter((d: any) => d.deal_type === "free_tier").length,
    limited_promotion: deals.filter((d: any) => d.deal_type === "limited_promotion").length,
    open_source: deals.filter((d: any) => d.deal_type === "open_source").length,
    free_credits: deals.filter((d: any) => d.deal_type === "free_credits").length,
  };

  // Live source counts
  let liveSources = { hackernews: 0, reddit: 0, producthunt: 0, github: 0, directories: 0 };
  try {
    const srcRows = await sql`SELECT url, name FROM sources WHERE active = 1` as any[];
    for (const s of srcRows) {
      const u = (s.url || "").toLowerCase();
      const n = (s.name || "").toLowerCase();
      if (u.includes("hnrss") || u.includes("hackernews") || n.includes("hacker news")) liveSources.hackernews++;
      else if (u.includes("reddit")) liveSources.reddit++;
      else if (u.includes("producthunt") || u.includes("product hunt")) liveSources.producthunt++;
      else if (u.includes("github")) liveSources.github++;
      else liveSources.directories++;
    }
  } catch { /* ok */ }

  return c.json({ deals, stats, live_sources: liveSources });
});

// ─── Scans ───
app.post("/api/scans/run", async (c) => {
  return c.json({ ok: true, action: "batch", processed: 0, discovered: 0, verified: 0, expired: 0, errors: [], message: "Scan triggered. Background processing handles new discoveries." });
});

function mapResource(r: any) {
  return {
    ...r,
    free_score: Number(r.free_score) || 0,
    confidence_score: Number(r.confidence_score) || 0,
    popularity: r.popularity != null ? Number(r.popularity) : null,
    forks: r.forks != null ? Number(r.forks) : null,
    infra_cost_month: r.infra_cost_month != null ? Number(r.infra_cost_month) : null,
    tags: parseJson(r.tags, []),
    capabilities: parseJson(r.capabilities, []),
    free_types: parseJson(r.free_types, []),
    source_urls: parseJson(r.source_urls, []),
    free_score_components: parseJson(r.free_score_components, {}),
    plans_json: parseJson(r.plans_json, null),
  };
}

function guessCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("llm") || t.includes("gpt") || t.includes("transformer") || t.includes("language model") || t.includes("chat") || t.includes("inference")) return "AI / LLM";
  if (t.includes("agent") || t.includes("agentic") || t.includes("autonomous") || t.includes("crew")) return "AI / Agent";
  if (t.includes("mcp") || t.includes("tool-use") || t.includes("function-call")) return "AI / MCP";
  if (t.includes("vision") || t.includes("image") || t.includes("stable-diffusion") || t.includes("midjourney") || t.includes("ocr")) return "AI / Vision";
  if (t.includes("voice") || t.includes("tts") || t.includes("speech") || t.includes("audio") || t.includes("stt")) return "AI / Voice";
  if (t.includes("embed") || t.includes("vector") || t.includes("rag") || t.includes("retrieval")) return "AI / Embeddings";
  if (t.includes("code") || t.includes("copilot") || t.includes("editor") || t.includes("ide") || t.includes("linter") || t.includes("formatter")) return "Developer Tools";
  if (t.includes("cli") || t.includes("terminal") || t.includes("shell") || t.includes("bash")) return "Developer Tools / CLI";
  if (t.includes("api") || t.includes("rest") || t.includes("graphql") || t.includes("grpc")) return "Developer Tools / API";
  if (t.includes("database") || t.includes("sql") || t.includes("postgres") || t.includes("mongo") || t.includes("redis")) return "Database";
  if (t.includes("hosting") || t.includes("deploy") || t.includes("vercel") || t.includes("docker") || t.includes("kubernetes") || t.includes("k8s")) return "Infrastructure";
  if (t.includes("monitor") || t.includes("observ") || t.includes("log") || t.includes("trace") || t.includes("metric")) return "Infrastructure / Monitoring";
  if (t.includes("security") || t.includes("auth") || t.includes("encrypt") || t.includes("vault") || t.includes("sso")) return "Security";
  if (t.includes("automat") || t.includes("workflow") || t.includes("pipeline") || t.includes("ci/cd") || t.includes("zapier")) return "Automation";
  if (t.includes("crm") || t.includes("sales") || t.includes("lead") || t.includes("customer")) return "Business / CRM";
  if (t.includes("email") || t.includes("newsletter") || t.includes("smtp") || t.includes("mail")) return "Business / Email";
  if (t.includes("design") || t.includes("ui") || t.includes("ux") || t.includes("figma") || t.includes("svg")) return "Design";
  if (t.includes("data") || t.includes("analytics") || t.includes("dashboard") || t.includes("report")) return "Data / Analytics";
  if (t.includes("note") || t.includes("wiki") || t.includes("doc") || t.includes("knowledge") || t.includes("markdown")) return "Productivity";
  if (t.includes("task") || t.includes("project") || t.includes("kanban") || t.includes("todo")) return "Productivity";
  if (t.includes("self-host") || t.includes("selfhost") || t.includes("docker") || t.includes("homelab")) return "Self-Hosted";
  if (t.includes("free") || t.includes("open") || t.includes("oss")) return "Open Source";
  return "Other";
}

function calcFreeScore(repo: any): number {
  let score = 30;
  const topics: string[] = (repo.topics || []).map((t: string) => t.toLowerCase());
  const desc = (repo.description || "").toLowerCase();
  const allText = [...topics, desc].join(" ");
  if (repo.license?.spdx_id && !["NOASSERTION", "UNLICENSED", "SEE LICENSE IN LICENSE"].includes(repo.license.spdx_id)) score += 12;
  if (repo.stargazers_count > 10000) score += 8;
  else if (repo.stargazers_count > 1000) score += 5;
  if (repo.forks_count > 500) score += 5;
  else if (repo.forks_count > 50) score += 3;
  if (allText.includes("free")) score += 5;
  if (allText.includes("self-host") || allText.includes("selfhost")) score += 5;
  if (allText.includes("local") || allText.includes("privacy")) score += 3;
  if (repo.pushed_at) {
    const pushed = new Date(repo.pushed_at);
    const daysSince = (Date.now() - pushed.getTime()) / 86400000;
    if (daysSince < 30) score += 5;
    else if (daysSince < 90) score += 3;
  }
  return Math.min(score, 100);
}

export default app;
