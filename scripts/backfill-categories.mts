try { process.loadEnvFile(); } catch {}
import { openD1FromFile } from '../server/d1-node.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const here = dirname(fileURLToPath(import.meta.url));
const stateDir = process.env.FI_STATE_DIR || join(process.env.HOME || '', '.fi-d1-state');
const dbFile = join(stateDir, 'freeintel.sqlite');
const db = openD1FromFile(dbFile);

function guessCategory(name: string, desc: string, tagsJson: string): string {
  const tags: string[] = JSON.parse(tagsJson || '[]');
  const t = `${name} ${desc} ${tags.join(" ")}`.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/mcp|model.context.protocol/, "MCP"],
    [/\bagent|agentic|crew|swarm|autogen|langgraph/, "AI Agents"],
    [/\bllm|\bgpt\b|inference|language.model|ollama|vllm|gguf|llama|mistral|openai|anthropic|claude|gemini|deepseek/, "LLM / AI Assistant"],
    [/ocr|pdf|document.pars|invoice|receipt/, "OCR / Document Processing"],
    [/vector|embedding.store|pgvector|qdrant|weaviate|milvus|chromadb/, "Vector Database"],
    [/postgres|mysql|sqlite|mongodb|database|supabase|firebase/, "Database"],
    [/workflow|automation|zapier|n8n|make\.com|rpa|etl|pipeline/, "Workflow Automation"],
    [/hosting|deploy|paas|serverless|edge|docker|kubernetes|k8s/, "Infrastructure"],
    [/uptime|monitoring|observab|grafana|prometheus|datadog|sentry|alerting/, "Monitoring"],
    [/text.to.speech|tts|speech|transcri|whisper|stt|voice|audio|music|suno|elevenlabs/, "Audio / Speech"],
    [/image.generat|stable.diffusion|flux\b|text.to.image|midjourney|dall.?e|diffusion|comfyui|civitai/, "Image Generation"],
    [/video.generat|text.to.video|runway|pika|luma|kling|sora/, "Video Generation"],
    [/scrap|crawl(er|ing)|puppeteer|playwright|browser.automation|headless/, "Web Scraping"],
    [/recruit|applicant.tracking|\bats\b|hiring|resume|talent|hr\b/, "HR / Recruiting"],
    [/design.tool|figma|vector.graphics|whiteboard|diagram|ui|ux/, "Design"],
    [/todo|notes|knowledge.base|second.brain|productivity|calendar|notion|obsidian/, "Productivity"],
    [/crm|customer.relationship|sales|pipeline|lead/, "CRM"],
    [/email|newsletter|mailing|smtp|sendgrid|mailgun/, "Email Marketing"],
    [/analytics|metrics|telemetry|insights|tracking|plausible|matomo/, "Analytics"],
    [/security|auth|identity|oauth|sso|vault|password|encrypt/, "Security / Auth"],
    [/chat|messaging|slack|discord|matrix|irc|xmpp|websocket/, "Communication"],
    [/video|streaming|zoom|meet|webrtc|rtc|telephon/, "Video Conferencing"],
    [/ci.?cd|github.actions|gitlab.ci|jenkins|drone|build|test|deploy|release/, "CI / CD"],
    [/code.editor|ide|vscode|intellij|vim|neovim|emacs/, "Code Editor"],
    [/coding|code.completion|copilot|code.review|lint|format|debug/, "Code Assistant"],
    [/transformer|diffusion|reinforcement|deep.learning|neural|torch|tensorflow|pytorch|jax/, "ML Framework"],
    [/huggingface|hugging.face|model.hub|pretrain|finetun|lora|qlora/, "ML Platform"],
    [/alternative|replace|self.hosted|open.source.alternative/, "Alternatives"],
    [/free.tier|free.api|free.credits|free.plan|pricing/, "APIs"],
  ];
  for (const [re, cat] of rules) if (re.test(t)) return cat;
  if (tags.length > 0) return "Developer Tools";
  return "Tool";
}

async function main() {
  const rows = await db.prepare('SELECT id, name, description, tags FROM resources WHERE category IS NULL').all();
  let updated = 0;
  for (const r of (rows.results || [])) {
    const cat = guessCategory(r.name || '', r.description || '', r.tags || '[]');
    await db.prepare('UPDATE resources SET category=? WHERE id=?').bind(cat, r.id).run();
    updated++;
  }
  console.log(`Backfilled ${updated} resources`);

  const check = await db.prepare('SELECT category, COUNT(*) as n FROM resources GROUP BY category ORDER BY n DESC').all();
  console.log('Categories:', JSON.stringify(check.results));
}
main();
