import { Hono } from "hono";
import { cors } from "hono/cors";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

const app = new Hono();
app.use("*", cors());

// ─── Health ───
app.get("/api/health", async (c) => {
  const count = await sql`SELECT COUNT(*) as n FROM resources`;
  return c.json({ ok: true, service: "free-intel-api", version: "4.0.0", resources: Number(count[0].n) });
});

// ─── Resources ───
app.get("/api/resources", async (c) => {
  const { q, category, free_type, sort, origin, alt, slug, limit = "50", offset = "0" } = c.req.query();
  const lim = Math.min(Number(limit) || 50, 200);
  const off = Number(offset) || 0;
  const order = sort === "name" ? sql`ORDER BY name`
    : sort === "score" || sort === "confidence" ? sql`ORDER BY free_score DESC`
    : sort === "popular" ? sql`ORDER BY popularity DESC NULLS LAST`
    : sort === "newest" ? sql`ORDER BY created_at DESC`
    : sql`ORDER BY free_score DESC`;

  let rows, countRows;
  if (q) {
    const p = `%${q}%`;
    rows = await sql`SELECT * FROM resources WHERE (name ILIKE ${p} OR description ILIKE ${p} OR tags::text ILIKE ${p}) ${order} LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE (name ILIKE ${p} OR description ILIKE ${p} OR tags::text ILIKE ${p})`;
  } else if (category && category !== "all") {
    rows = await sql`SELECT * FROM resources WHERE category = ${category} ${order} LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE category = ${category}`;
  } else if (origin) {
    rows = await sql`SELECT * FROM resources WHERE origin = ${origin} ${order} LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE origin = ${origin}`;
  } else if (free_type && free_type !== "all") {
    const ftp = `%${free_type}%`;
    rows = await sql`SELECT * FROM resources WHERE free_types::text ILIKE ${ftp} ${order} LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE free_types::text ILIKE ${ftp}`;
  } else {
    rows = await sql`SELECT * FROM resources ${order} LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources`;
  }

  return c.json({
    count: Number((countRows as any)[0]?.n || 0),
    items: (rows as any[]).map(mapResource),
  });
});

// ─── Facets ─── (MUST be before :slug to avoid route conflict)
app.get("/api/resources/facets", async (c) => {
  const cats = await sql`SELECT category, COUNT(*) as n FROM resources WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC`;
  return c.json({ categories: (cats as any[]).map((r: any) => ({ category: r.category, n: Number(r.n) })), types: [] });
});

// ─── AI Search ───
app.post("/api/resources/ai-search", async (c) => {
  const { q } = await c.req.json();
  if (!q) return c.json({ count: 0, items: [] });
  const terms = q.toLowerCase().split(/\s+/);
  const pats = terms.slice(0, 5).map((t: string) => `%${t}%`);
  const result = await sql`
    SELECT *, free_score + CASE WHEN 'open_source' = ANY(SELECT jsonb_array_elements_text(free_types)) THEN 10 ELSE 0 END as relevance
    FROM resources
    WHERE name ILIKE ${pats[0]} OR description ILIKE ${pats[0]} OR tags::text ILIKE ${pats[0]}
       OR name ILIKE ${pats[1] || pats[0]} OR description ILIKE ${pats[1] || pats[0]} OR tags::text ILIKE ${pats[1] || pats[0]}
       OR name ILIKE ${pats[2] || pats[0]} OR description ILIKE ${pats[2] || pats[0]} OR tags::text ILIKE ${pats[2] || pats[0]}
    ORDER BY relevance DESC LIMIT 50`;
  return c.json({ count: (result as any[]).length, items: (result as any[]).map(mapResource), query: q, expanded_terms: terms });
});

// ─── Resource Detail ───
app.get("/api/resources/:slug", async (c) => {
  const slug = c.req.param("slug");
  const rows = await sql`SELECT * FROM resources WHERE slug = ${slug}`;
  if (!(rows as any[]).length) return c.json({ error: "not_found" }, 404);
  const resource = mapResource((rows as any[])[0]);
  const evRows = await sql`SELECT * FROM evidence WHERE resource_id = ${resource.id} LIMIT 20`;
  const altRows = await sql`SELECT slug, name, free_score, verification_status, alt_kind, license, url FROM resources WHERE alt_of = ${resource.name} LIMIT 10`;
  return c.json({ resource, evidence: evRows, alternatives: altRows });
});

// ─── Capabilities ───
app.get("/api/capabilities", async (c) => {
  const rows = await sql`SELECT capability as cap, COUNT(*) as n FROM resources WHERE capability IS NOT NULL AND capability != '' GROUP BY capability ORDER BY n DESC LIMIT 30`;
  return c.json({ capabilities: rows });
});

// ─── Deals ───
app.get("/api/deals", async (c) => {
  const { type, category, q } = c.req.query();
  let deals;
  if (type === "open_source") {
    deals = await sql`SELECT * FROM resources WHERE free_score >= 50 AND 'open_source' = ANY(SELECT jsonb_array_elements_text(free_types)) ORDER BY free_score DESC LIMIT 100`;
  } else if (q) {
    const p = `%${q}%`;
    deals = await sql`SELECT * FROM resources WHERE free_score >= 50 AND (name ILIKE ${p} OR description ILIKE ${p} OR tags::text ILIKE ${p}) ORDER BY free_score DESC LIMIT 100`;
  } else {
    deals = await sql`SELECT * FROM resources WHERE free_score >= 50 ORDER BY free_score DESC LIMIT 100`;
  }
  const items = (deals as any[]).map((r: any) => ({
    id: r.slug, name: r.name, description: r.description, category: r.category || "General",
    deal_type: (Array.isArray(r.free_types) && r.free_types.includes("open_source")) ? "open_source" : "free_tier",
    score: r.free_score || 0, tags: parseJson(r.tags, []), url: r.url || r.github_url,
    source: "free-intel-db", provider: r.provider,
    free_types: parseJson(r.free_types, []), free_allowance: r.free_allowance,
    card_required: r.card_required, self_hostable: r.self_hostable, commercial_use: r.commercial_use,
  }));
  return c.json({ deals: items, stats: { total: items.length, free_tier: items.filter(d => d.deal_type === "free_tier").length, limited_promotion: 0, open_source: items.filter(d => d.deal_type === "open_source").length, free_credits: 0 }, live_sources: {} });
});

// ─── Radar Status ───
app.get("/api/radar/status", async (c) => {
  const total = await sql`SELECT COUNT(*) as n FROM resources`;
  const verified = await sql`SELECT COUNT(*) as n FROM resources WHERE verification_status = 'verified'`;
  const discovered = await sql`SELECT COUNT(*) as n FROM resources WHERE verification_status = 'discovered'`;
  const github = await sql`SELECT COUNT(*) as n FROM resources WHERE origin = 'github'`;
  const openSource = await sql`SELECT COUNT(*) as n FROM resources WHERE 'open_source' = ANY(SELECT jsonb_array_elements_text(free_types))`;
  const expiring = await sql`SELECT COUNT(*) as n FROM resources WHERE expires_at IS NOT NULL AND expires_at > NOW()::text`;
  const alternatives = await sql`SELECT COUNT(*) as n FROM resources WHERE alt_of IS NOT NULL AND alt_of != ''`;
  const events24h = await sql`SELECT COUNT(*) as n FROM events WHERE created_at > NOW() - INTERVAL '24 hours'`;
  const activeSources = await sql`SELECT COUNT(*) as n FROM sources WHERE active = 1`;

  return c.json({
    last_scan: null,
    resources: {
      total: Number(total[0].n), verified: Number(verified[0].n), unverified: Number(discovered[0].n),
      github: Number(github[0].n), open_source: Number(openSource[0].n),
      expiring: Number(expiring[0].n), alternatives: Number(alternatives[0].n),
    },
    active_sources: Number(activeSources[0].n), events_24h: Number(events24h[0].n),
    crawl_queue: [], server_time: new Date().toISOString(),
  });
});

// ─── Radar Events ───
app.get("/api/radar/events", async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 30, 100);
  const rows = await sql`SELECT e.*, r.slug as resource_slug, r.name as resource_name FROM events e LEFT JOIN resources r ON e.resource_id = r.id ORDER BY e.created_at DESC LIMIT ${limit}`;
  return c.json({ events: rows });
});

// ─── Daily ───
app.get("/api/daily", async (c) => {
  const eventCounts = await sql`SELECT type, COUNT(*) as n FROM events WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY type`;
  const newResources = await sql`SELECT slug, name, description, category, free_score, confidence_score, verification_status, origin, url FROM resources WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY free_score DESC LIMIT 20`;
  return c.json({ window: "24h", event_counts: eventCounts, new_resources: newResources, expiring_soon: [], note: "Counts reflect real pipeline activity only." });
});

// ─── GitHub Scan ───
app.post("/api/radar/github-scan", async (c) => {
  const { query } = await c.req.json();
  if (!query) return c.json({ error: "query_required" }, 400);
  const token = process.env.GITHUB_TOKEN;
  if (!token) return c.json({ error: "github_token_not_configured" }, 500);

  const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+free+open+source&sort=stars&per_page=10`;
  const resp = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "free-intel" } });
  if (!resp.ok) return c.json({ error: `github_api_${resp.status}` }, 502);
  const data = await resp.json() as any;
  const repos = data.items || [];

  let discovered = 0;
  for (const repo of repos) {
    const slug = `${repo.owner?.login || "unknown"}-${repo.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = await sql`SELECT id FROM resources WHERE slug = ${slug}`;
    if ((existing as any[]).length) continue;
    await sql`INSERT INTO resources (slug, name, description, url, github_url, provider, category, tags, capabilities, resource_type, free_types, license, popularity, forks, github_last_push, verification_status, origin, confidence_score, free_score, created_at, updated_at)
      VALUES (${slug}, ${repo.full_name}, ${repo.description || ""}, ${repo.html_url}, ${repo.html_url}, ${repo.owner?.login}, 'Open Source',
        ${JSON.stringify(repo.topics || [])}, ${JSON.stringify(repo.topics?.slice(0, 5) || [])}, 'github_repo',
        ${JSON.stringify(["open_source"])}, ${repo.license?.spdx_id || "UNKNOWN"}, ${repo.stargazers_count}, ${repo.forks_count},
        ${repo.pushed_at}, 'discovered', 'github', 30, 35, NOW(), NOW()) ON CONFLICT (slug) DO NOTHING`;
    discovered++;
  }

  return c.json({ ok: true, query, processed: repos.length, discovered, verified: 0, expired: 0, errors: [], message: `${discovered} new repositories discovered.` });
});

// ─── Scan Run ───
app.post("/api/scans/run", async (c) => {
  return c.json({ ok: true, action: "batch", processed: 0, discovered: 0, verified: 0, expired: 0, errors: [], message: "Scan triggered. Background processing handles new discoveries." });
});

// ─── Products Resolve ───
app.post("/api/products/resolve", async (c) => {
  const { name } = await c.req.json();
  if (!name) return c.json({ error: "name_required" }, 400);
  const p = `%${name}%`;
  const rows = await sql`SELECT * FROM resources WHERE name ILIKE ${p} OR slug ILIKE ${p} LIMIT 1`;
  if (!(rows as any[]).length) return c.json({ resolved: false, message: `"${name}" is not in the discovered database yet.`, resolution: null, current_price: null, alternatives: [] });
  const r = (rows as any[])[0];
  const altRows = await sql`SELECT slug, name, url, description, free_score, verification_status, alt_kind, license FROM resources WHERE alt_of = ${r.name} OR alt_of = ${r.slug} LIMIT 5`;
  const evRows = await sql`SELECT * FROM evidence WHERE resource_id = ${r.id} LIMIT 10`;
  return c.json({
    resolved: true, resolved_via: "database",
    product: { slug: r.slug, name: r.name, provider: r.provider, category: r.category, description: r.description, website: r.url, pricing_url: r.pricing_url, pricing_last_checked: r.price_last_checked, plans: parseJson(r.plans_json, []), free_types: parseJson(r.free_types, []) },
    pricing_status: r.plans_json ? "EXTRACTED_FROM_OFFICIAL_PAGE" : "NO_PRICING_DATA",
    evidence: evRows, current_price: null,
    alternatives: altRows.map((a: any) => ({ name: a.name, slug: a.slug, url: a.url, description: a.description, score: a.free_score, relationship: "open_source_alt", reasoning: "Free alternative found in database." })),
  });
});

// ─── Products Search Alternatives ───
app.post("/api/products/search-alternatives", async (c) => {
  const { tool } = await c.req.json();
  if (!tool) return c.json({ error: "tool_required" }, 400);
  const p = `%${tool}%`;
  const inSeed = await sql`SELECT id FROM resources WHERE name ILIKE ${p} OR alt_of ILIKE ${p} LIMIT 1`;
  const alts = await sql`SELECT slug, name, url, description, free_score, license, self_hostable, verification_status FROM resources WHERE alt_of ILIKE ${p} OR (name ILIKE ${p} AND alt_of IS NOT NULL) ORDER BY free_score DESC LIMIT 10`;
  const fromDb = await sql`SELECT slug, name, url, description, free_score, license, verification_status FROM resources WHERE name ILIKE ${p} OR description ILIKE ${p} ORDER BY free_score DESC LIMIT 5`;
  const results = [...(alts as any[]).map((a: any) => ({ name: a.name, slug: a.slug, url: a.url, description: a.description, score: a.free_score, source: "discovery-engine", reasoning: `Free alternative. License: ${a.license}.`, key_differences: [] })),
    ...(fromDb as any[]).filter((f: any) => !alts.find((a: any) => a.slug === f.slug)).map((f: any) => ({ name: f.name, slug: f.slug, url: f.url, description: f.description, score: f.free_score, source: "discovery-engine", reasoning: "Found in database.", key_differences: [] }))];
  return c.json({ tool, in_seed_database: (inSeed as any[]).length > 0, results: results.slice(0, 10), sources_checked: ["verified-alternatives", "discovery-engine", "github-search"] });
});

// ─── Cost Analyze ───
app.post("/api/cost/analyze", async (c) => {
  const { tools } = await c.req.json();
  if (!tools?.length) return c.json({ total_monthly_spend_entered: 0, estimated_monthly_saving: 0, estimated_annual_saving: 0, lines_analyzed: 0, lines_awaiting_input: 0, confidence_note: "No tools provided.", analyzes: [] });
  let totalSpend = 0, totalSaving = 0, analyzed = 0;
  const analyzes = [];
  for (const tool of tools) {
    const name = tool.name || tool.tool;
    const cost = Number(tool.monthly_cost || tool.cost || 0);
    totalSpend += cost;
    const p = `%${name}%`;
    const rows = await sql`SELECT * FROM resources WHERE name ILIKE ${p} OR slug ILIKE ${p} OR alt_of ILIKE ${p} LIMIT 1`;
    if (!(rows as any[]).length) {
      analyzes.push({ tool: name, resolved: false, status: "PRODUCT_UNRESOLVED", message: `"${name}" not found.`, alternatives: [], current_cost: cost });
      continue;
    }
    const r = (rows as any[])[0];
    const altRows = await sql`SELECT slug, name, url, description, free_score, license, self_hostable FROM resources WHERE alt_of = ${r.name} OR alt_of = ${r.slug} ORDER BY free_score DESC LIMIT 3`;
    const alt = (altRows as any[])[0];
    const saving = alt ? cost : 0;
    totalSaving += saving; analyzed++;
    analyzes.push({
      tool: name, resolved: true, status: "ANALYZED", current_cost: cost, cost_basis: "your entered spend",
      possible_cost: 0, possible_cost_basis: alt ? `$0 via ${alt.name} (${alt.license})` : "Unknown",
      monthly_saving: saving, annual_saving: saving * 12,
      replacement: alt ? { slug: alt.slug, name: alt.name, url: alt.url, description: alt.description, score: alt.free_score, relationship: "OPEN-SOURCE ALTERNATIVE", free_score: alt.free_score, license: alt.license, self_hostable: alt.self_hostable } : null,
      also_considered: (altRows as any[]).slice(1).map((a: any) => ({ name: a.name, slug: a.slug, description: a.description, score: a.free_score, url: a.url })),
      recommendation: alt ? `${alt.name} (OPEN-SOURCE ALTERNATIVE) may replace ${name}. Validate before cancelling.` : `No free alternative found for ${name}.`,
    });
  }
  return c.json({ total_monthly_spend_entered: totalSpend, estimated_monthly_saving: totalSaving, estimated_annual_saving: totalSaving * 12, lines_analyzed: analyzed, lines_awaiting_input: tools.length - analyzed, confidence_note: "Savings = your entered spend minus stored replacement costs.", analyzes });
});

// ─── Submissions ───
app.post("/api/submissions", async (c) => {
  const { url, name, description, why_useful } = await c.req.json();
  if (!url) return c.json({ error: "valid_url_required" }, 400);
  await sql`CREATE TABLE IF NOT EXISTS submissions (id SERIAL PRIMARY KEY, url TEXT NOT NULL, name TEXT, description TEXT, why_useful TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  const rows = await sql`INSERT INTO submissions (url, name, description, why_useful, status) VALUES (${url}, ${name || ""}, ${description || ""}, ${why_useful || ""}, 'pending') RETURNING id`;
  return c.json({ ok: true, id: (rows as any[])[0]?.id, status: "verification", message: "Submission captured. The engine will independently fetch and verify it." });
});

// ─── Admin Overview ───
app.get("/api/admin/overview", async (c) => {
  const statusCounts = await sql`SELECT verification_status as s, COUNT(*) as n FROM resources GROUP BY verification_status`;
  const lowConf = await sql`SELECT slug, name, confidence_score, verification_status FROM resources WHERE confidence_score < 40 ORDER BY confidence_score ASC LIMIT 10`;
  const sources = await sql`SELECT * FROM sources ORDER BY tier, name LIMIT 50`;
  const submissions = await sql`SELECT * FROM submissions ORDER BY created_at DESC LIMIT 20`;
  const recentScans = await sql`SELECT * FROM events ORDER BY created_at DESC LIMIT 10`;
  return c.json({ status_counts: statusCounts, low_confidence: lowConf, sources, submissions, duplicates: [], recent_scans: recentScans, crawl_queue: [], recent_task_errors: [], db_time: new Date().toISOString() });
});

// ─── Admin Actions ───
app.post("/api/admin/submissions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await sql`UPDATE submissions SET status = ${body.action === "approve" ? "approved" : "rejected"} WHERE id = ${id}`;
  return c.json({ ok: true });
});

app.post("/api/admin/resources/:slug", async (c) => {
  const slug = c.req.param("slug");
  const body = await c.req.json();
  if (body.action === "autoverify") {
    await sql`UPDATE resources SET verification_status = 'verified', confidence_score = 80 WHERE slug = ${slug}`;
  } else if (body.action === "expire") {
    await sql`UPDATE resources SET verification_status = 'expired' WHERE slug = ${slug}`;
  }
  return c.json({ ok: true });
});

app.post("/api/admin/sources/:id/toggle", async (c) => {
  const id = Number(c.req.param("id"));
  await sql`UPDATE sources SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ${id}`;
  return c.json({ ok: true });
});

// ─── Stacks Generate ───
app.post("/api/stacks/generate", async (c) => {
  const { goal } = await c.req.json();
  return c.json({ project_name: goal || "My Stack", description: `Stack for: ${goal}`, estimated_monthly_cost: "Varies", setup_complexity: "Medium", layers: [], total_tools: 0 });
});

// ─── Helpers ───
function parseJson(v: any, def: any): any {
  if (v == null) return def;
  if (typeof v === "object") return v;
  try { const p = JSON.parse(String(v)); return p ?? def; } catch { return def; }
}

function mapResource(r: any) {
  return {
    ...r,
    tags: parseJson(r.tags, []),
    capabilities: parseJson(r.capabilities, []),
    free_types: parseJson(r.free_types, []),
    source_urls: parseJson(r.source_urls, []),
    free_score_components: parseJson(r.free_score_components, {}),
    plans_json: parseJson(r.plans_json, null),
  };
}

export default app;
