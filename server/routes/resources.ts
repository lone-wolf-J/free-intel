import { Hono } from "hono";
import { j, hydrate } from "../lib/upsert";
import type { Env } from "../lib/util";

export const resourceApp = new Hono<{ Bindings: Env }>();

const SORTS: Record<string, string> = {
  score: "free_score DESC",
  confidence: "confidence_score DESC",
  newest: "first_discovered DESC, id DESC",
  popular: "popularity IS NULL, popularity DESC",
  name: "name COLLATE NOCASE ASC"
};

// Keyword expansion map for common search terms
const KEYWORD_EXPANSIONS: Record<string, string[]> = {
  "coding": ["code", "coding", "developer", "programming", "ide", "editor", "copilot"],
  "agent": ["agent", "agentic", "autonomous", "automation", "ai agent", "multi-agent"],
  "llm": ["llm", "language model", "inference", "gpt", "claude", "gemini", "llama", "mistral"],
  "chat": ["chat", "messaging", "communication", "team", "slack", "discord"],
  "ocr": ["ocr", "pdf", "document parsing", "text extraction", "scan"],
  "recruit": ["recruit", "hiring", "ats", "applicant tracking", "talent", "resume"],
  "crm": ["crm", "customer relationship", "sales", "pipeline", "lead management"],
  "email": ["email", "mail", "newsletter", "smtp", "imap", "email marketing"],
  "hosting": ["hosting", "deploy", "paas", "serverless", "cloud", "infrastructure"],
  "database": ["database", "db", "sql", "nosql", "postgresql", "mysql", "sqlite", "mongodb"],
  "monitoring": ["monitoring", "observability", "uptime", "apm", "logging", "metrics"],
  "workflow": ["workflow", "automation", "zapier", "n8n", "pipeline", "orchestration"],
  "design": ["design", "ui", "ux", "figma", "mockup", "wireframe", "prototype"],
  "analytics": ["analytics", "metrics", "dashboard", "bi", "business intelligence"],
  "mcp": ["mcp", "model context protocol", "tool server", "tool use"],
  "free": ["free", "open source", "oss", "self-hosted", "free tier", "no cost"],
  "api": ["api", "rest", "graphql", "endpoint", "gateway"],
  "website": ["website", "web app", "landing page", "blog", "frontend", "static site"],
  "ecommerce": ["ecommerce", "e-commerce", "store", "shop", "marketplace", "stripe"],
  "accounting": ["accounting", "invoice", "finance", "bookkeeping", "billing"],
  "storage": ["storage", "file sharing", "cloud storage", "s3", "minio", "object storage"],
  "video": ["video", "video generation", "text to video", "streaming", "recording"],
  "image": ["image", "image generation", "text to image", "stable diffusion", "flux", "dall-e"],
  "audio": ["audio", "speech", "tts", "text to speech", "voice", "transcription", "whisper"],
  "search": ["search", "semantic search", "vector search", "rag", "retrieval"],
  "security": ["security", "auth", "authentication", "authorization", "sso", "oauth"],
  "backup": ["backup", "disaster recovery", "replication", "snapshot"],
  "testing": ["testing", "test", "qa", "quality assurance", "automation testing"],
  "ci": ["ci", "cd", "continuous integration", "continuous deployment", "pipeline", "devops"],
  "project": ["project management", "task", "sprint", "kanban", "scrum", "jira"],
  "collaboration": ["collaboration", "team", "workspace", "shared", "real-time"],
  "solo": ["solo", "one person", "freelance", "individual", "personal", "indie"],
  "enterprise": ["enterprise", "business", "company", "organization", "team", "scale"],
};

function expandSearchQuery(query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const expanded = new Set<string>();

  for (const term of terms) {
    expanded.add(term);
    // Direct expansion
    if (KEYWORD_EXPANSIONS[term]) {
      for (const e of KEYWORD_EXPANSIONS[term]) expanded.add(e);
    }
    // Partial match expansion
    for (const [key, values] of Object.entries(KEYWORD_EXPANSIONS)) {
      if (key.includes(term) || term.includes(key)) {
        for (const v of values) expanded.add(v);
      }
    }
  }

  return [...expanded];
}

async function aiExpandQuery(env: Env, query: string): Promise<string[]> {
  if (!env.GEMINI_API_KEY) return expandSearchQuery(query);

  try {
    const { llmJson } = await import("../lib/llm");
    const result = await llmJson(env, `You are a search query optimizer. The user is searching for free/open-source tools.
User query: "${query}"

Expand this into a list of search keywords that would find relevant tools. Include:
- Direct synonyms
- Related tool categories
- Specific tool names that match the intent
- Technical terms that describe this category

Respond with JSON: {"keywords":["list","of","keywords"],"category":"detected category","intent":"what the user wants"}`, 400);

    if (result?.keywords?.length) {
      const llmKeywords = result.keywords.map((k: string) => k.toLowerCase());
      const basicExpanded = expandSearchQuery(query);
      return [...new Set([...llmKeywords, ...basicExpanded])];
    }
  } catch { /* LLM failed, use basic expansion */ }

  return expandSearchQuery(query);
}

resourceApp.get("/resources", async (c) => {
  const q = c.req.query("q")?.trim() || "";
  const category = c.req.query("category");
  const type = c.req.query("type");
  const freeType = c.req.query("free_type");
  const capability = c.req.query("capability");
  const origin = c.req.query("origin");
  const alt = c.req.query("alt");
  const status = c.req.query("status");
  const sort = SORTS[c.req.query("sort") || "score"] || SORTS.score;
  const limit = Math.min(Number(c.req.query("limit") || 100), 200);

  let sql = "SELECT * FROM resources WHERE 1=1";
  const binds: any[] = [];
  if (category && category !== "all") { sql += " AND category = ?"; binds.push(category); }
  if (type && type !== "all") { sql += " AND resource_type = ?"; binds.push(type); }
  if (freeType && freeType !== "all") { sql += " AND free_types LIKE ?"; binds.push(`%"${freeType}"%`); }
  if (capability && capability !== "all") {
    sql += " AND EXISTS (SELECT 1 FROM json_each(CASE WHEN capabilities IS NULL OR capabilities='' THEN '[]' ELSE capabilities END) je WHERE je.value=?)";
    binds.push(capability);
  }
  if (origin && origin !== "all") { sql += " AND origin = ?"; binds.push(origin); }
  if (alt === "only") { sql += " AND alt_of IS NOT NULL AND alt_kind IN ('open_source_alt','self_hosted_alt','direct','partial')"; }
  if (status === "expired") sql += " AND verification_status = 'expired'";
  else if (status === "active") sql += " AND verification_status != 'expired'";

  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  let items = (rows.results || []).map(hydrate);

  if (q) {
    const expandedTerms = await aiExpandQuery(c.env, q);
    const originalTerms = q.toLowerCase().split(/\s+/).filter(t => t.length > 1);

    items = items
      .map((r: any) => {
        const nameLower = (r.name || "").toLowerCase();
        const descLower = (r.description || "").toLowerCase();
        const tags = (r.tags || []).join(" ").toLowerCase();
        const caps = (r.capabilities || []).join(" ").toLowerCase();
        const altOf = String(r.alt_of || "").toLowerCase();
        const subcategory = String(r.subcategory || "").toLowerCase();
        const provider = String(r.provider || "").toLowerCase();

        let score = 0;

        // Exact phrase match (highest weight)
        if (nameLower.includes(q.toLowerCase())) score += 100;
        if (descLower.includes(q.toLowerCase())) score += 50;

        // Original terms matching
        for (const term of originalTerms) {
          if (nameLower.includes(term)) score += 40;
          else if (altOf.includes(term)) score += 35;
          else if (tags.includes(term)) score += 20;
          else if (caps.includes(term)) score += 18;
          else if (descLower.includes(term)) score += 10;
          else if (subcategory.includes(term)) score += 12;
          else if (provider.includes(term)) score += 8;
        }

        // Expanded terms matching (lower weight but broader)
        for (const term of expandedTerms) {
          if (nameLower.includes(term)) score += 15;
          else if (tags.includes(term)) score += 8;
          else if (caps.includes(term)) score += 7;
          else if (descLower.includes(term)) score += 5;
        }

        // Bonus for free/open-source resources
        const freeTypes = r.free_types || [];
        if (freeTypes.includes("open_source")) score += 5;
        if (freeTypes.includes("free_tier")) score += 3;
        if (r.self_hostable === "yes") score += 2;

        // Bonus for higher free_score
        score += (r.free_score || 0) / 10;

        return { r, s: score };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || b.r.free_score - a.r.free_score)
      .map((x) => x.r);
  }

  return c.json({ count: items.length, items: items.slice(0, limit) });
});

// AI-powered search endpoint — uses LLM for deeper understanding
resourceApp.post("/resources/ai-search", async (c) => {
  const body = await c.req.json().catch(() => ({}) as any);
  const query = String(body?.q || "").trim().slice(0, 300);
  if (!query) return c.json({ count: 0, items: [], query: "" });

  // Step 1: Get all resources
  const rows = await c.env.DB.prepare(
    "SELECT * FROM resources WHERE verification_status != 'expired' ORDER BY free_score DESC"
  ).all();
  const allItems = (rows.results || []).map(hydrate);

  // Step 2: Expand query with LLM
  const expandedTerms = await aiExpandQuery(c.env, query);
  const originalTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

  // Step 3: Score all resources
  const scored = allItems.map((r: any) => {
    const nameLower = (r.name || "").toLowerCase();
    const descLower = (r.description || "").toLowerCase();
    const tags = (r.tags || []).join(" ").toLowerCase();
    const caps = (r.capabilities || []).join(" ").toLowerCase();
    const altOf = String(r.alt_of || "").toLowerCase();

    let score = 0;

    // Exact phrase match
    if (nameLower.includes(query.toLowerCase())) score += 100;
    if (descLower.includes(query.toLowerCase())) score += 50;

    // Original terms
    for (const term of originalTerms) {
      if (nameLower.includes(term)) score += 40;
      else if (altOf.includes(term)) score += 35;
      else if (tags.includes(term)) score += 20;
      else if (caps.includes(term)) score += 18;
      else if (descLower.includes(term)) score += 10;
    }

    // Expanded terms
    for (const term of expandedTerms) {
      if (nameLower.includes(term)) score += 15;
      else if (tags.includes(term)) score += 8;
      else if (caps.includes(term)) score += 7;
      else if (descLower.includes(term)) score += 5;
    }

    // Free/Open-source bonus
    const freeTypes = r.free_types || [];
    if (freeTypes.includes("open_source")) score += 5;
    if (freeTypes.includes("free_tier")) score += 3;
    if (r.self_hostable === "yes") score += 2;
    score += (r.free_score || 0) / 10;

    return { r, s: score };
  });

  const results = scored
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || b.r.free_score - a.r.free_score)
    .slice(0, 50)
    .map(x => x.r);

  return c.json({
    count: results.length,
    items: results,
    query,
    expanded_terms: expandedTerms.slice(0, 20)
  });
});

resourceApp.get("/resources/facets", async (c) => {
  const cats = await c.env.DB.prepare(
    "SELECT category AS category, COUNT(*) AS n FROM resources GROUP BY category ORDER BY n DESC"
  ).all();
  const types = await c.env.DB.prepare(
    "SELECT resource_type AS t, COUNT(*) AS n FROM resources GROUP BY resource_type ORDER BY n DESC"
  ).all();
  return c.json({ categories: cats.results || [], types: types.results || [] });
});

resourceApp.get("/resources/:slug", async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM resources WHERE slug=?").bind(c.req.param("slug")).first();
  if (!row) return c.json({ error: "not_found" }, 404);
  const r = hydrate(row);

  const evidence = await c.env.DB.prepare(
    `SELECT id, claim, source_url, evidence_text, retrieved_at, method, confidence
     FROM evidence WHERE resource_id=? ORDER BY confidence DESC, id DESC LIMIT 20`
  ).bind(r.id).all();

  const alts = await c.env.DB.prepare(
    `SELECT slug,name,free_score,verification_status,alt_kind,license,url FROM resources
     WHERE alt_of IN (?, LOWER(?)) AND verification_status != 'expired'
     ORDER BY CASE alt_kind WHEN 'direct' THEN 0 WHEN 'open_source_alt' THEN 1 WHEN 'self_hosted_alt' THEN 2 ELSE 3 END, free_score DESC LIMIT 8`
  )
    .bind(r.slug, r.name)
    .all();

  return c.json({
    resource: r,
    evidence: evidence.results || [],
    alternatives: alts.results || []
  });
});
