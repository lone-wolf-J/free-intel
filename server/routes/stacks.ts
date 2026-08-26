import { Hono } from "hono";
import { j, hydrate, slugify } from "../lib/upsert";
import { findAlternatives, ALTERNATIVES_DB } from "../db/alternatives-seed";
import type { Env } from "../lib/util";

export const stackApp = new Hono<{ Bindings: Env }>();

const LAYER_ROLES: Array<{ layer: string; capability: string }> = [
  { layer: "LLM / INFERENCE", capability: "llm-inference" },
  { layer: "AGENT FRAMEWORK", capability: "agent-framework" },
  { layer: "MCP TOOLS", capability: "mcp" },
  { layer: "DOCUMENT PARSING / OCR", capability: "ocr-document-parsing" },
  { layer: "DATABASE", capability: "database" },
  { layer: "VECTOR DATABASE", capability: "vector-database" },
  { layer: "WORKFLOW AUTOMATION", capability: "workflow-automation" },
  { layer: "HOSTING", capability: "hosting-deploy" },
  { layer: "MONITORING", capability: "monitoring-observability" },
  { layer: "COMMUNICATION", capability: "communication" },
  { layer: "EMAIL", capability: "email" },
  { layer: "PROJECT MANAGEMENT", capability: "project-management" },
  { layer: "DOCUMENT EDITING", capability: "document-editing" },
  { layer: "VIDEO CONFERENCING", capability: "video-conferencing" },
  { layer: "CLOUD STORAGE", capability: "cloud-storage" },
  { layer: "DESIGN / UI", capability: "design-ui" },
  { layer: "ANALYTICS", capability: "analytics" },
  { layer: "CI/CD", capability: "ci-cd" },
  { layer: "CRM", capability: "crm" },
  { layer: "ACCOUNTING", capability: "accounting" }
];

interface StackPlan {
  project_name: string;
  description: string;
  layers: Array<{
    layer: string;
    capability: string;
    purpose: string;
    tools: Array<{
      name: string;
      url: string;
      why: string;
      free: boolean;
      open_source: boolean;
      self_hostable: boolean;
    }>;
  }>;
  estimated_monthly_cost: string;
  setup_complexity: string;
  notes: string;
}

async function searchToolInDB(db: any, toolName: string): Promise<any | null> {
  const lower = toolName.toLowerCase();
  const row = await db.prepare(
    `SELECT * FROM resources WHERE verification_status != 'expired'
     AND (LOWER(name) = ? OR slug = ? OR LOWER(name) LIKE ?)
     ORDER BY free_score DESC LIMIT 1`
  ).bind(lower, lower.replace(/[^a-z0-9]+/g, "-"), `%${lower}%`).first();
  return row ? hydrate(row) : null;
}

async function searchGitHubForTool(env: Env, toolName: string): Promise<any | null> {
  if (!env.GITHUB_TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(toolName)}&sort=stars&per_page=3`,
      { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    return {
      name: item.name,
      slug: item.full_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      url: item.html_url,
      description: item.description?.slice(0, 200) || null,
      score: Math.min(70, Math.floor((item.stargazers_count || 0) / 100) + 40),
      source: "github",
      stars: item.stargazers_count,
      license: item.license?.spdx_id
    };
  } catch { return null; }
}

stackApp.get("/capabilities", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT value AS cap, COUNT(*) AS n FROM resources, json_each(CASE WHEN capabilities IS NULL OR capabilities='' THEN '[]' ELSE capabilities END) WHERE verification_status!='expired' GROUP BY value ORDER BY n DESC`
  ).all();
  return c.json({ capabilities: rows.results || [] });
});

stackApp.post("/stacks/generate", async (c) => {
  const b = await c.req.json().catch(() => ({}) as any);
  const goal = String(b?.goal || "").trim().slice(0, 500);
  if (!goal) return c.json({ error: "goal_required" }, 400);

  const isReplaceIntent = /replace|alternative|free|instead|swap|move|cheaper|stop paying|cheaper than/i.test(goal);

  // ── STEP 1: ALWAYS use LLM to understand the user's intent ──
  let stackPlan: StackPlan | null = null;

  if (c.env.GEMINI_API_KEY) {
    try {
      const { llmJson } = await import("../lib/llm");
      stackPlan = await llmJson(c.env, `You are an expert tech stack architect. The user wants: "${goal}"

Analyze this request and design a complete technology stack. For EVERY layer needed, suggest 2-3 specific tools with their actual URLs.

RULES:
- Only suggest tools you are CONFIDENT actually exist (real GitHub repos, real websites)
- Prioritize FREE and open-source tools
- Include both hosted (free tier) and self-hostable options
- Be specific: "React" not "frontend framework", "PostgreSQL" not "database"
- For simple requests (e.g. "build a chat app"), include: frontend, backend, database, hosting, auth
- For complex requests (e.g. "run a solo company"), include ALL business layers: CRM, email, accounting, project management, hosting, etc.
- For "replace X" requests, focus on finding direct free alternatives to X
- EVERY tool must have a real URL (GitHub repo or official website)

Respond with JSON:
{
  "project_name": "short descriptive name",
  "description": "1-2 sentence summary of the recommended stack",
  "layers": [
    {
      "layer": "LAYER NAME (e.g. Frontend, Backend, Database, LLM, Hosting, Auth, CRM, Email, etc.)",
      "capability": "capability-key (e.g. frontend, backend, database, llm-inference, hosting-deploy, crm, email, etc.)",
      "purpose": "why this layer is needed for the user's goal",
      "tools": [
        {
          "name": "Tool Name",
          "url": "https://actual-url.com",
          "why": "1 sentence why this tool fits",
          "free": true,
          "open_source": false,
          "self_hostable": false
        }
      ]
    }
  ],
  "estimated_monthly_cost": "Free / $X/mo / $0 with self-hosting",
  "setup_complexity": "Low / Medium / High",
  "notes": "any important caveats or recommendations"
}`, 2000);
    } catch { /* LLM failed, will use fallback */ }
  }

  // ── STEP 2: Fallback if LLM didn't return a plan ──
  if (!stackPlan || !stackPlan.layers?.length) {
    // Try regex-based fallback for common patterns
    const layersWanted: string[] = [];
    const toolNames: string[] = [];

    // Pattern matching for common intents
    const intentPatterns: Array<[RegExp, string[], string[]]> = [
      [/chat|messag|talk|communicat/i, ["communication", "llm-inference", "hosting-deploy", "database"], []],
      [/website|web\s*app|landing\s*page|blog/i, ["hosting-deploy", "database", "design-ui", "ci-cd"], []],
      [/ai\s*(agent|bot|assistant)|automat/i, ["llm-inference", "agent-framework", "workflow-automation", "hosting-deploy"], []],
      [/crm|sales|customer/i, ["crm", "email", "database", "hosting-deploy"], []],
      [/recruit|hiring|ats|talent/i, ["hr-recruiting", "database", "hosting-deploy"], []],
      [/accounting|invoice|finance|bookkeep/i, ["accounting", "database", "hosting-deploy"], []],
      [/email\s*(market|campaign|newsletter)/i, ["email", "analytics", "hosting-deploy"], []],
      [/project\s*manag|task|sprint|kanban/i, ["project-management", "communication", "hosting-deploy"], []],
      [/design|ui|ux|figma/i, ["design-ui", "hosting-deploy", "ci-cd"], []],
      [/monitor|observab|uptime/i, ["monitoring-observability", "hosting-deploy"], []],
      [/rag|search|embed|vector/i, ["vector-database", "llm-inference", "database", "hosting-deploy"], []],
      [/data\s*(pipeline|etl|flow)/i, ["workflow-automation", "database", "hosting-deploy"], []],
      [/api|microservice/i, ["hosting-deploy", "database", "monitoring-observability", "ci-cd"], []],
      [/mobile\s*app|ios|android/i, ["hosting-deploy", "database", "ci-cd"], []],
      [/ecommerce|store|shop/i, ["hosting-deploy", "database", "crm", "analytics"], []],
      [/solo\s*(company|business)|one\s*person|freelanc/i, ["crm", "email", "accounting", "project-management", "hosting-deploy"], []],
    ];

    for (const [re, caps] of intentPatterns) {
      if (re.test(goal)) layersWanted.push(...caps);
    }

    // Check for known tools to replace
    const knownTools = ALTERNATIVES_DB.map(p => [p.name.toLowerCase(), ...p.aliases.map(a => a.toLowerCase())]).flat();
    const goalLower = goal.toLowerCase();
    for (const tool of knownTools) {
      if (goalLower.includes(tool)) {
        const product = ALTERNATIVES_DB.find(p => p.name.toLowerCase() === tool || p.aliases.some(a => a.toLowerCase() === tool));
        if (product) toolNames.push(product.name);
      }
    }

    // If still no layers, give a broad default set
    if (!layersWanted.length && !toolNames.length) {
      layersWanted.push("hosting-deploy", "database", "llm-inference", "workflow-automation", "analytics");
    }

    // Build a plan from regex matches
    const uniqueCaps = [...new Set(layersWanted)].slice(0, 8);
    stackPlan = {
      project_name: goal.slice(0, 60),
      description: `Recommended stack for: ${goal}`,
      layers: uniqueCaps.map(cap => {
        const role = LAYER_ROLES.find(r => r.capability === cap);
        return {
          layer: role?.layer || cap.toUpperCase(),
          capability: cap,
          purpose: `Required for: ${goal}`,
          tools: []
        };
      }),
      estimated_monthly_cost: "Varies",
      setup_complexity: "Medium",
      notes: "For more specific recommendations, try being more detailed about what you want to build."
    };
  }

  // ── STEP 3: For each layer, search DB + GitHub for real tools ──
  const enrichedLayers: any[] = [];
  let totalTools = 0;

  for (const layer of stackPlan.layers) {
    const enrichedTools: any[] = [];

    for (const tool of (layer.tools || [])) {
      // Search database first
      const dbResult = await searchToolInDB(c.env.DB, tool.name);
      if (dbResult) {
        enrichedTools.push({
          name: tool.name,
          slug: dbResult.slug,
          url: tool.url || dbResult.url,
          description: dbResult.description || tool.why,
          score: dbResult.free_score || 70,
          source: "database",
          free: tool.free,
          open_source: tool.open_source,
          self_hostable: tool.self_hostable,
          reasoning: tool.why,
          stars: dbResult.popularity,
          license: dbResult.license
        });
        continue;
      }

      // Search GitHub
      const ghResult = await searchGitHubForTool(c.env, tool.name);
      if (ghResult) {
        enrichedTools.push({
          ...tool,
          slug: ghResult.slug,
          url: ghResult.url,
          description: ghResult.description || tool.why,
          score: ghResult.score,
          source: "github",
          stars: ghResult.stars,
          license: ghResult.license
        });
        continue;
      }

      // Use LLM-suggested tool as-is (with caveat)
      enrichedTools.push({
        ...tool,
        slug: slugify(tool.name),
        score: 60,
        source: "llm-suggested",
        note: "Verify this tool exists before relying on it"
      });
    }

    // If no tools found for this layer, search DB by capability
    if (enrichedTools.length === 0) {
      const capResults = await c.env.DB.prepare(
        `SELECT * FROM resources WHERE verification_status != 'expired'
         AND EXISTS (SELECT 1 FROM json_each(CASE WHEN capabilities IS NULL OR capabilities='' THEN '[]' ELSE capabilities END) je WHERE je.value = ?)
         ORDER BY free_score DESC LIMIT 3`
      ).bind(layer.capability).all();
      for (const row of (capResults.results || []) as any[]) {
        const h = hydrate(row);
        enrichedTools.push({
          name: h.name,
          slug: h.slug,
          url: h.url,
          description: h.description,
          score: h.free_score || 65,
          source: "database-capability",
          free: true,
          open_source: h.license != null,
          self_hostable: h.self_hostable === "yes",
          reasoning: `Found in database for capability: ${layer.capability}`
        });
      }
    }

    // If STILL no tools, search GitHub by capability keywords
    if (enrichedTools.length === 0 && c.env.GITHUB_TOKEN) {
      const searchTerms: Record<string, string> = {
        "llm-inference": "llm inference server open source",
        "agent-framework": "ai agent framework python",
        "mcp": "model context protocol server",
        "database": "database management system",
        "vector-database": "vector database similarity search",
        "workflow-automation": "workflow automation platform self-hosted",
        "hosting-deploy": "platform as a service self-hosted",
        "monitoring-observability": "monitoring observability platform",
        "communication": "team chat application self-hosted",
        "email": "email server self-hosted",
        "project-management": "project management tool self-hosted",
        "design-ui": "design tool ui builder",
        "analytics": "analytics platform self-hosted",
        "crm": "customer relationship management open source",
        "accounting": "accounting software open source",
        "hr-recruiting": "applicant tracking system open source",
        "document-editing": "document editor collaborative"
      };
      const q = searchTerms[layer.capability] || layer.capability;
      try {
        const res = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=5`,
          { headers: { Authorization: `Bearer ${c.env.GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
        );
        if (res.ok) {
          const data: any = await res.json();
          // Filter out awesome-lists and unrelated repos
          const excludePatterns = /^awesome[-_]|^list[-_]of|^curated|^resources[-_]for|^cheat[-_]sheet/i;
          for (const item of (data.items || []).slice(0, 5)) {
            if (excludePatterns.test(item.name)) continue;
            if (item.stargazers_count < 10) continue; // Skip low-quality repos
            enrichedTools.push({
              name: item.name,
              slug: item.full_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              url: item.html_url,
              description: item.description?.slice(0, 200) || null,
              score: Math.min(70, Math.floor((item.stargazers_count || 0) / 100) + 40),
              source: "github-discovery",
              free: true,
              open_source: true,
              self_hostable: true,
              reasoning: `${item.stargazers_count} stars on GitHub`,
              stars: item.stargazers_count,
              license: item.license?.spdx_id
            });
          }
        }
      } catch { /* GitHub search failed */ }
    }

    if (enrichedTools.length > 0) {
      enrichedLayers.push({
        layer: layer.layer,
        capability: layer.capability,
        purpose: layer.purpose,
        tools: enrichedTools
      });
      totalTools += enrichedTools.length;
    }
  }

  // ── STEP 4: Handle tool replacements (for "replace X" intents) ──
  const toolReplacements: any[] = [];
  for (const toolName of (isReplaceIntent ? extractToolNames(goal) : [])) {
    const alts = await searchAlternativesRealtime(c.env.DB, c.env, toolName);
    toolReplacements.push({
      replacing: toolName,
      alternatives: alts.map((a: any) => ({
        name: a.name, slug: a.slug || slugify(a.name), url: a.url, description: a.description || null,
        score: a.score || 70, efficiency: a.efficiency || 65, source: a.source || "unknown",
        reasoning: a.reasoning || null, key_differences: a.key_differences || []
      }))
    });
  }

  // ── STEP 5: Return the complete stack ──
  return c.json({
    goal,
    project_name: stackPlan.project_name,
    description: stackPlan.description,
    layers: enrichedLayers,
    tool_replacements: toolReplacements,
    estimated_monthly_cost: stackPlan.estimated_monthly_cost,
    setup_complexity: stackPlan.setup_complexity,
    notes: stackPlan.notes,
    total_tools: totalTools,
    integrity_note: "Tools sourced from live database, GitHub, and AI analysis. Verify critical tools before production use."
  });
});

function extractToolNames(goal: string): string[] {
  const names: string[] = [];
  const patterns = [
    /replace\s+([A-Za-z0-9\s.]+?)(?:\s+with|\s+for|\s+using|$)/gi,
    /alternative\s+(?:to\s+)?([A-Za-z0-9\s.]+?)(?:\s+with|\s+for|$)/gi,
    /free\s+(?:version|alternative)\s+(?:of\s+)?([A-Za-z0-9\s.]+?)(?:\s+with|\s+for|$)/gi,
    /instead\s+of\s+([A-Za-z0-9\s.]+?)(?:\s+with|\s+for|$)/gi,
    /swap\s+([A-Za-z0-9\s.]+?)(?:\s+with|\s+for|$)/gi,
    /move\s+(?:away\s+)?from\s+([A-Za-z0-9\s.]+?)(?:\s+to|\s+with|$)/gi
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(goal)) !== null) {
      let raw = m[1]?.trim();
      if (raw && raw.length > 1 && raw.length < 50) {
        raw = raw.replace(/\s*(email|chat|messenger|app|software|tool|platform|service)$/i, "").trim();
        if (raw.length > 1) names.push(raw);
      }
    }
  }
  const knownTools = ALTERNATIVES_DB.map(p => [p.name.toLowerCase(), ...p.aliases.map(a => a.toLowerCase())]).flat();
  const goalLower = goal.toLowerCase();
  for (const tool of knownTools) {
    if (goalLower.includes(tool) && !names.some(n => n.toLowerCase().includes(tool) || tool.includes(n.toLowerCase()))) {
      const product = ALTERNATIVES_DB.find(p => p.name.toLowerCase() === tool || p.aliases.some(a => a.toLowerCase() === tool));
      if (product) names.push(product.name);
    }
  }
  return [...new Set(names)];
}

async function searchAlternativesRealtime(db: any, env: Env, toolName: string): Promise<any[]> {
  const results: any[] = [];
  const lower = toolName.toLowerCase();

  const seedMatch = findAlternatives(toolName);
  if (seedMatch?.alternatives) {
    for (const a of seedMatch.alternatives) {
      results.push({ ...a, source: "seed", score: a.score || 75, efficiency: a.efficiency || 70 });
    }
  }

  const dbAlts = await db.prepare(
    `SELECT slug, name, description, url, free_score, alt_of, alt_kind
     FROM resources WHERE verification_status != 'expired' AND LOWER(name) != ? AND slug != ?
     AND (alt_of = ? OR LOWER(name) LIKE ? OR description LIKE ?)
     ORDER BY free_score DESC LIMIT 5`
  ).bind(lower, lower.replace(/[^a-z0-9]+/g, "-"), lower, `%${lower}%`, `%alternative to ${toolName}%`).all();
  for (const row of (dbAlts.results || []) as any[]) {
    if (results.some((r: any) => r.slug === row.slug)) continue;
    results.push({ ...row, source: "database", score: row.free_score || 60, efficiency: Math.min(75, (row.free_score || 0) + 5) });
  }

  if (env.GITHUB_TOKEN) {
    try {
      const queries = [`free alternative to ${toolName}`, `open source ${toolName} alternative`];
      for (const q of queries) {
        const ghRes = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=5`, {
          headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" }
        });
        if (ghRes.ok) {
          const ghData: any = await ghRes.json();
          for (const item of ghData.items || []) {
            const slug = item.full_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            if (results.some((r: any) => r.slug === slug)) continue;
            results.push({
              name: item.name, slug, url: item.html_url, description: item.description?.slice(0, 200) || null,
              score: Math.min(70, Math.floor((item.stargazers_count || 0) / 100) + 40), efficiency: 55,
              source: "github-search", reasoning: `${item.stargazers_count} stars on GitHub`
            });
          }
        }
      }
    } catch { /* GitHub search failed */ }
  }

  if (env.GEMINI_API_KEY) {
    try {
      const { llmJson } = await import("../lib/llm");
      const llmResult = await llmJson(env, `You are a free-software expert. List 8 real, working free or open-source alternatives to "${toolName}" for someone who wants to stop paying for it. For each, provide: name, description (1-2 sentences), url (must be a real website or GitHub repo — NO fabrication), score (0-100 rating how good it is as a free replacement), efficiency (0-100 rating feature coverage vs the paid tool), reasoning (1-2 sentences why this is a good free replacement), key_differences (array of 2-3 differences from the paid tool). Focus on tools with free tiers, open-source projects, and self-hostable options. ONLY include tools you are confident actually exist. Respond with JSON: {"alternatives":[...]}`, 800);
      if (llmResult?.alternatives) {
        for (const alt of llmResult.alternatives) {
          if (results.some((r: any) => r.name?.toLowerCase() === alt.name?.toLowerCase())) continue;
          results.push({ name: alt.name, slug: slugify(alt.name || ""), url: alt.url, description: alt.description, score: alt.score || 70, efficiency: alt.efficiency || 65, source: "llm-suggested", reasoning: alt.reasoning || "", key_differences: alt.key_differences || [] });
        }
      }
    } catch { /* LLM failed */ }
  }

  if (results.length === 0) {
    const toolLower = toolName.toLowerCase();
    const categoryResults = await db.prepare(
      `SELECT slug, name, description, url, free_score, alt_of, alt_kind
       FROM resources WHERE verification_status != 'expired'
         AND (alt_of IS NOT NULL OR description LIKE ? OR name LIKE ?)
       ORDER BY free_score DESC LIMIT 8`
    ).bind(`%${toolLower}%`, `%${toolLower}%`).all();
    for (const row of (categoryResults.results || []) as any[]) {
      if (results.some((r: any) => r.slug === row.slug)) continue;
      results.push({ ...row, source: "category-fallback", score: row.free_score || 55, efficiency: 50 });
    }
  }

  return results.slice(0, 10);
}

interface ToolInput {
  name: string;
  monthly_cost?: number | null;
  use_estimate?: boolean;
}

const ALT_KIND_LABELS: Record<string, string> = {
  open_source_alt: "OPEN-SOURCE ALTERNATIVE",
  self_hosted_alt: "SELF-HOSTED ALTERNATIVE",
  direct: "DIRECT ALTERNATIVE",
  partial: "PARTIAL ALTERNATIVE"
};

stackApp.post("/cost/analyze", async (c) => {
  const body = await c.req.json().catch(() => ({}) as any);
  const tools: ToolInput[] = Array.isArray(body?.tools) ? body.tools.slice(0, 12) : [];
  const { findAlternatives: findAlts } = await import("../db/alternatives-seed");

  const analyses: any[] = [];
  let totalMonthly = 0;
  let totalSaving = 0;
  let linesWithSavings = 0;

  for (const t of tools) {
    const name = String(t?.name || "").trim();
    if (!name) continue;
    const hasUserCost = typeof t.monthly_cost === "number" && t.monthly_cost > 0;
    totalMonthly += hasUserCost ? t.monthly_cost! : 0;

    let target: any =
      (await c.env.DB.prepare("SELECT * FROM resources WHERE LOWER(name)=? LIMIT 1").bind(name.toLowerCase()).first()) ||
      (await c.env.DB.prepare(
        "SELECT r.* FROM product_aliases a JOIN resources r ON r.id=a.resource_id WHERE a.alias_lower=? LIMIT 1"
      ).bind(name.toLowerCase()).first());

    const alts = await c.env.DB.prepare(
      `SELECT * FROM resources WHERE verification_status != 'expired' AND alt_of = ?
       AND alt_kind IN ('open_source_alt','self_hosted_alt','direct','partial')
       ORDER BY CASE alt_kind WHEN 'direct' THEN 0 WHEN 'open_source_alt' THEN 1 WHEN 'self_hosted_alt' THEN 2 ELSE 3 END,
       free_score DESC LIMIT 4`
    ).bind(name.toLowerCase()).all();

    let altList = (alts.results || []).map(hydrate);
    const seedMatch = findAlts(name);
    const seedAlts = seedMatch?.alternatives || [];
    const currentPriceSeed = seedMatch?.price_month || null;

    if (altList.length === 0 && seedAlts.length > 0) {
      altList = seedAlts.map((sa: any) => ({
        slug: sa.slug, name: sa.name, description: sa.description, url: sa.url,
        alt_kind: sa.relationship, free_score: sa.score, efficiency: sa.efficiency,
        reasoning: sa.reasoning, key_differences: sa.key_differences, license: null,
        self_hostable: sa.self_hostable ? "yes" : "unknown",
        infrastructure_note: sa.notes, infra_cost_month: 0, origin: "seed"
      }));
    }

    if (!hasUserCost && !t.use_estimate && currentPriceSeed) {
      analyses.push({
        tool: name, resolved: !!target || !!seedMatch, status: "NEEDS_COST_INPUT",
        message: target ? `"${target.name}" found. Enter your actual monthly spend.` : seedMatch ? `"${seedMatch.name}" recognized. Enter your actual spend.` : `"${name}" not in database yet.`,
        alternatives: altList.map((a: any) => ({ name: a.name, slug: a.slug, description: a.description || null, score: a.free_score || 0, efficiency: a.efficiency || null, kind: a.alt_kind, url: a.url || null, reasoning: a.reasoning || null, key_differences: a.key_differences || [], notes: a.infrastructure_note || null })),
        known_plans: seedMatch ? [{ name: "Known price", price_month: currentPriceSeed }] : []
      });
      continue;
    }

    if (!hasUserCost && !t.use_estimate) {
      analyses.push({
        tool: name, resolved: !!target, status: target ? "NEEDS_COST_INPUT" : "PRODUCT_UNRESOLVED",
        message: target ? `"${target.name}" found. Enter your actual monthly spend.` : `"${name}" not in database yet.`,
        alternatives: altList.map((a: any) => ({ name: a.name, slug: a.slug, score: a.free_score || 0, kind: a.alt_kind, url: a.url || null }))
      });
      continue;
    }

    let basisCost: number | null = null;
    let basisLabel = "";
    if (hasUserCost) { basisCost = t.monthly_cost!; basisLabel = "your entered spend"; }
    else {
      const plans = target ? j<any[]>(target.plans_json, []) : [];
      const prices = plans.map((p: any) => p.price_month).filter((p: any) => typeof p === "number" && p > 0);
      if (prices.length) { basisCost = Math.min(...prices); basisLabel = "ESTIMATED FROM PUBLIC PRICING"; }
      else if (currentPriceSeed) { basisCost = currentPriceSeed; basisLabel = "KNOWN MARKET PRICE"; }
      else { analyses.push({ tool: name, resolved: !!target, status: "NO_VERIFIED_ESTIMATE", message: "No pricing available. Enter your actual spend.", alternatives: altList.map((a: any) => ({ name: a.name, slug: a.slug, score: a.free_score || 0, kind: a.alt_kind, url: a.url || null })) }); continue; }
    }

    if (!altList.length) {
      analyses.push({ tool: name, resolved: !!target, status: "NO_REPLACEMENT_FOUND", current_cost: basisCost, cost_basis: basisLabel, message: "No verified alternative exists yet." });
      continue;
    }

    const best = altList[0];
    const possible = typeof best.infra_cost_month === "number" ? best.infra_cost_month : 0;
    const saving = Math.max(0, basisCost - possible);
    totalSaving += saving;
    linesWithSavings++;

    analyses.push({
      tool: name, resolved: !!target || !!seedMatch, status: "ANALYZED",
      current_cost: basisCost, cost_basis: basisLabel, possible_cost: possible,
      possible_cost_basis: typeof best.infra_cost_month === "number" ? "stored infrastructure estimate" : "$0 software license; hosting depends on deployment",
      monthly_saving: saving, annual_saving: saving * 12,
      replacement: { slug: best.slug, name: best.name, url: best.url, description: best.description || null, score: best.free_score || 0, efficiency: best.efficiency || null, relationship: ALT_KIND_LABELS[best.alt_kind] || String(best.alt_kind || "ALTERNATIVE").toUpperCase(), free_score: best.free_score, license: best.license, self_hostable: best.self_hostable, caveats: best.infrastructure_note || null, reasoning: best.reasoning || null, key_differences: best.key_differences || [] },
      also_considered: altList.slice(1).map((a: any) => ({ name: a.name, slug: a.slug, description: a.description || null, score: a.free_score || 0, efficiency: a.efficiency || null, relationship: ALT_KIND_LABELS[a.alt_kind] || a.alt_kind, url: a.url || null, reasoning: a.reasoning || null })),
      recommendation: `${best.name} (${ALT_KIND_LABELS[best.alt_kind] || "alternative"}) may replace ${name}. Validate before cancelling.`
    });
  }

  return c.json({
    total_monthly_spend_entered: totalMonthly, estimated_monthly_saving: totalSaving,
    estimated_annual_saving: totalSaving * 12,
    lines_analyzed: analyses.filter((a) => a.status === "ANALYZED").length,
    lines_awaiting_input: analyses.filter((a) => a.status === "NEEDS_COST_INPUT").length,
    confidence_note: "Savings = your entered spend minus stored replacement costs. Unknown costs excluded, never assumed $0.",
    analyses
  });
});
