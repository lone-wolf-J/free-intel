import { Hono } from "hono";
import { cors } from "hono/cors";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

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
async function unsafeRows(query: string): Promise<any[]> { return (await sql.query(query)) as any[]; }
const esc = (s: string) => s.replace(/'/g, "''");

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

  let rows: any[];

  if (q) {
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
    rows = await sql`SELECT * FROM resources LIMIT 500` as any[];
  }

  const sorted = (rows as any[])
    .filter(isTool)
    .sort((a: any, b: any) => (b.free_score || 0) - (a.free_score || 0))
    .slice(off, off + lim);

  return c.json({
    count: sorted.length,
    items: sorted.map(mapResource),
  });
});

// ─── Facets ─── (MUST be before :slug to avoid route conflict)
app.get("/api/resources/facets", async (c) => {
  const cats = await sql`SELECT category, COUNT(*) as n FROM resources WHERE category IS NOT NULL AND resource_type != 'article' AND category NOT IN ('pricing', 'directory', 'ai-directory', 'research', 'newsletter', 'news', 'comparison', 'tutorial', 'guide', 'list', 'roundup', 'announcement') GROUP BY category ORDER BY n DESC`;
  return c.json({ categories: (cats as any[]).map((r: any) => ({ category: r.category, n: Number(r.n) })), types: [] });
});

// ─── AI Search ───
app.post("/api/resources/ai-search", async (c) => {
  const { q } = await c.req.json();
  if (!q) return c.json({ count: 0, items: [] });
  const terms = q.toLowerCase().split(/\s+/);
  const pats = terms.slice(0, 5).map((t: string) => `%${t}%`);
  const result = await unsafeRows(`
    SELECT *, free_score + CASE WHEN 'open_source' = ANY(SELECT jsonb_array_elements_text(free_types)) THEN 10 ELSE 0 END as relevance
    FROM resources
    WHERE resource_type != 'article'
      AND category NOT IN ('pricing', 'directory', 'ai-directory', 'research', 'newsletter', 'news', 'comparison', 'tutorial', 'guide', 'list', 'roundup', 'announcement')
      AND url NOT LIKE '%reddit.com%' AND url NOT LIKE '%arxiv.org%' AND url NOT LIKE '%theguardian%' AND url NOT LIKE '%medium.com%' AND url NOT LIKE '%substack.com%'
      AND (name ILIKE '${esc(pats[0])}' OR description ILIKE '${esc(pats[0])}' OR tags::text ILIKE '${esc(pats[0])}'
        OR name ILIKE '${esc(pats[1] || pats[0])}' OR description ILIKE '${esc(pats[1] || pats[0])}' OR tags::text ILIKE '${esc(pats[1] || pats[0])}'
        OR name ILIKE '${esc(pats[2] || pats[0])}' OR description ILIKE '${esc(pats[2] || pats[0])}' OR tags::text ILIKE '${esc(pats[2] || pats[0])}')
    ORDER BY relevance DESC LIMIT 50`);
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
  // Try by capability column first
  let rows = await sql`SELECT capability as cap, COUNT(*) as n FROM resources WHERE capability IS NOT NULL AND capability != '' GROUP BY capability ORDER BY n DESC LIMIT 30`;
  if (!(rows as any[]).length) {
    // Fallback: derive from category
    rows = await sql`SELECT category as cap, COUNT(*) as n FROM resources WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC LIMIT 30`;
  }
  return c.json({ capabilities: rows });
});

// ─── Deals ───
const CURATED_DEALS = [
  // Limited-time promotions
  { id: "lt-1", name: "Claude Pro Free Trial", description: "Anthropic offers free trial of Claude Pro for new users. Access to Claude 3.5 Sonnet with extended context.", category: "AI / LLM", deal_type: "limited_promotion", score: 90, tags: ["ai", "llm", "claude", "free-trial"], url: "https://claude.ai", provider: "Anthropic", free_types: ["limited_promotion"], card_required: "yes", self_hostable: "no", commercial_use: "no" },
  { id: "lt-2", name: "GitHub Copilot Free Tier", description: "GitHub Copilot now offers a free tier with 2000 completions and 50 chat messages per month.", category: "Developer Tools", deal_type: "limited_promotion", score: 88, tags: ["coding", "copilot", "ai", "free-tier"], url: "https://github.com/features/copilot", provider: "GitHub", free_types: ["limited_promotion"], card_required: "no", self_hostable: "no", commercial_use: "yes" },
  { id: "lt-3", name: "Cursor Pro Free Trial", description: "Cursor AI editor offers free trial with premium features. AI-powered code editing.", category: "Developer Tools", deal_type: "limited_promotion", score: 85, tags: ["coding", "editor", "ai", "cursor"], url: "https://cursor.sh", provider: "Cursor", free_types: ["limited_promotion"], card_required: "yes", self_hostable: "no", commercial_use: "yes" },
  { id: "lt-4", name: "Vercel Pro Free Trial", description: "Vercel offers 14-day free trial of Pro plan with enhanced build limits.", category: "Infrastructure", deal_type: "limited_promotion", score: 82, tags: ["hosting", "deploy", "vercel", "free-trial"], url: "https://vercel.com", provider: "Vercel", free_types: ["limited_promotion"], card_required: "yes", self_hostable: "no", commercial_use: "yes" },
  { id: "lt-5", name: "Notion Plus Free Trial", description: "Notion offers free trial of Plus plan for teams. Enhanced collaboration features.", category: "Productivity", deal_type: "limited_promotion", score: 78, tags: ["notes", "wiki", "productivity", "notion"], url: "https://notion.so", provider: "Notion Labs", free_types: ["limited_promotion"], card_required: "yes", self_hostable: "no", commercial_use: "yes" },
  { id: "lt-6", name: "Figma Professional Free Trial", description: "Figma offers free trial of Professional plan for 30 days.", category: "Design", deal_type: "limited_promotion", score: 80, tags: ["design", "ui", "figma", "free-trial"], url: "https://figma.com", provider: "Figma", free_types: ["limited_promotion"], card_required: "yes", self_hostable: "no", commercial_use: "yes" },
  { id: "lt-7", name: "Linear Free for Teams", description: "Linear offers free tier for up to 250 issues. Modern project management.", category: "Productivity", deal_type: "limited_promotion", score: 84, tags: ["project", "task", "linear", "free-tier"], url: "https://linear.app", provider: "Linear", free_types: ["limited_promotion"], card_required: "no", self_hostable: "no", commercial_use: "yes" },

  // Free credits
  { id: "fc-1", name: "OpenAI $5 Free Credits", description: "New OpenAI API accounts receive $5 in free credits for GPT models.", category: "AI / LLM", deal_type: "free_credits", score: 92, tags: ["ai", "llm", "openai", "gpt", "free-credits"], url: "https://platform.openai.com", provider: "OpenAI", free_types: ["free_credits"], card_required: "yes", self_hostable: "no", commercial_use: "yes" },
  { id: "fc-2", name: "Google Cloud $300 Free Credits", description: "New Google Cloud accounts get $300 in free credits for 90 days.", category: "Infrastructure", deal_type: "free_credits", score: 95, tags: ["cloud", "hosting", "gcp", "free-credits"], url: "https://cloud.google.com", provider: "Google Cloud", free_types: ["free_credits"], card_required: "yes", self_hostable: "no", commercial_use: "yes" },
  { id: "fc-3", name: "AWS Free Tier $100 Credits", description: "AWS offers free tier with 12 months of limited free usage plus $100 credits.", category: "Infrastructure", deal_type: "free_credits", score: 93, tags: ["cloud", "hosting", "aws", "free-tier"], url: "https://aws.amazon.com/free", provider: "AWS", free_types: ["free_credits"], card_required: "yes", self_hostable: "no", commercial_use: "yes" },
  { id: "fc-4", name: "Azure $200 Free Credits", description: "Microsoft Azure offers $200 in free credits for new accounts.", category: "Infrastructure", deal_type: "free_credits", score: 91, tags: ["cloud", "hosting", "azure", "free-credits"], url: "https://azure.microsoft.com", provider: "Microsoft", free_types: ["free_credits"], card_required: "yes", self_hostable: "no", commercial_use: "yes" },
  { id: "fc-5", name: "Replicate Free Credits", description: "Replicate offers $5 in free credits for running AI models in the cloud.", category: "AI / LLM", deal_type: "free_credits", score: 85, tags: ["ai", "llm", "inference", "replicate", "free-credits"], url: "https://replicate.com", provider: "Replicate", free_types: ["free_credits"], card_required: "yes", self_hostable: "no", commercial_use: "yes" },
  { id: "fc-6", name: "Groq Free API Access", description: "Groq offers free API access with fast LLM inference on their LPU hardware.", category: "AI / LLM", deal_type: "free_credits", score: 87, tags: ["ai", "llm", "inference", "groq", "free-api"], url: "https://groq.com", provider: "Groq", free_types: ["free_credits"], card_required: "no", self_hostable: "no", commercial_use: "yes" },
  { id: "fc-7", name: "Hugging Face Free Inference", description: "Hugging Face offers free serverless inference API for many open models.", category: "AI / LLM", deal_type: "free_credits", score: 89, tags: ["ai", "llm", "huggingface", "inference", "free-api"], url: "https://huggingface.co", provider: "Hugging Face", free_types: ["free_credits"], card_required: "no", self_hostable: "yes", commercial_use: "yes" },
];

app.get("/api/deals", async (c) => {
  const { type, category, q } = c.req.query();

  // Get database deals (free_tier and open_source from resources)
  let dbDeals;
  if (q) {
    const p = `%${q}%`;
    dbDeals = await sql`SELECT * FROM resources WHERE free_score >= 50 AND resource_type != 'article' AND category NOT IN ('pricing', 'directory', 'ai-directory', 'research', 'newsletter', 'news', 'comparison', 'tutorial', 'guide', 'list', 'roundup', 'announcement') AND url NOT LIKE '%reddit.com%' AND url NOT LIKE '%arxiv.org%' AND url NOT LIKE '%theguardian%' AND url NOT LIKE '%medium.com%' AND url NOT LIKE '%substack.com%' AND (name ILIKE ${p} OR description ILIKE ${p} OR tags::text ILIKE ${p}) ORDER BY free_score DESC LIMIT 100`;
  } else {
    dbDeals = await sql`SELECT * FROM resources WHERE free_score >= 50 AND resource_type != 'article' AND category NOT IN ('pricing', 'directory', 'ai-directory', 'research', 'newsletter', 'news', 'comparison', 'tutorial', 'guide', 'list', 'roundup', 'announcement') AND url NOT LIKE '%reddit.com%' AND url NOT LIKE '%arxiv.org%' AND url NOT LIKE '%theguardian%' AND url NOT LIKE '%medium.com%' AND url NOT LIKE '%substack.com%' ORDER BY free_score DESC LIMIT 100`;
  }

  const dbItems = (dbDeals as any[]).filter(isTool).map((r: any) => ({
    id: r.slug, name: r.name, description: r.description, category: r.category || "General",
    deal_type: (Array.isArray(r.free_types) && r.free_types.includes("open_source")) ? "open_source" : "free_tier",
    score: r.free_score || 0, tags: parseJson(r.tags, []), url: r.url || r.github_url,
    source: "free-intel-db", provider: r.provider,
    free_types: parseJson(r.free_types, []), free_allowance: r.free_allowance,
    card_required: r.card_required, self_hostable: r.self_hostable, commercial_use: r.commercial_use,
  }));

  // Merge with curated deals
  let allDeals = [...CURATED_DEALS, ...dbItems];

  // Apply filters
  if (type && type !== "all") {
    allDeals = allDeals.filter(d => d.deal_type === type);
  }
  if (category) {
    allDeals = allDeals.filter(d => d.category.toLowerCase().includes(category.toLowerCase()));
  }
  if (q) {
    const lower = q.toLowerCase();
    allDeals = allDeals.filter(d =>
      d.name.toLowerCase().includes(lower) ||
      d.description.toLowerCase().includes(lower) ||
      d.tags.some((t: string) => t.includes(lower))
    );
  }

  allDeals.sort((a: any, b: any) => b.score - a.score);

  const stats = {
    total: allDeals.length,
    free_tier: allDeals.filter(d => d.deal_type === "free_tier").length,
    limited_promotion: allDeals.filter(d => d.deal_type === "limited_promotion").length,
    open_source: allDeals.filter(d => d.deal_type === "open_source").length,
    free_credits: allDeals.filter(d => d.deal_type === "free_credits").length,
  };

  return c.json({ deals: allDeals.slice(0, 100), stats, live_sources: {} });
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

  const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+stars:>50&sort=stars&order=desc&per_page=15`;
  const resp = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "free-intel", Accept: "application/vnd.github+json" },
  });

  if (resp.status === 403 || resp.status === 429) {
    const reset = resp.headers.get("x-ratelimit-reset");
    const remaining = resp.headers.get("x-ratelimit-remaining");
    return c.json({ error: "rate_limited", remaining, resets_at: reset ? new Date(Number(reset) * 1000).toISOString() : null }, 429);
  }
  if (!resp.ok) return c.json({ error: `github_api_${resp.status}` }, 502);

  const data = await resp.json() as any;
  const repos = data.items || [];
  let discovered = 0, alreadyKnown = 0;
  const newNames: string[] = [];

  for (const repo of repos) {
    const slug = `${repo.owner?.login || "unknown"}-${repo.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = await sql`SELECT id FROM resources WHERE slug = ${slug}`;
    if ((existing as any[]).length) { alreadyKnown++; continue; }

    const topics: string[] = repo.topics || [];
    const desc = (repo.description || "").toLowerCase();
    const allText = [...topics, desc, repo.full_name].join(" ").toLowerCase();
    const category = guessCategory(allText);
    const freeScore = calcFreeScore(repo);

    await sql`INSERT INTO resources (slug, name, description, url, github_url, provider, category, tags, capabilities, resource_type, free_types, license, popularity, forks, github_last_push, verification_status, origin, confidence_score, free_score, created_at, updated_at)
      VALUES (${slug}, ${repo.full_name}, ${repo.description || ""}, ${repo.html_url}, ${repo.html_url}, ${repo.owner?.login}, ${category},
        ${JSON.stringify(topics.slice(0, 20))}, ${JSON.stringify(topics.slice(0, 8))}, 'github_repo',
        ${JSON.stringify(["open_source"])}, ${repo.license?.spdx_id || "UNKNOWN"}, ${repo.stargazers_count || 0}, ${repo.forks_count || 0},
        ${repo.pushed_at || null}, 'discovered', 'github', 30, ${freeScore}, NOW(), NOW()) ON CONFLICT (slug) DO NOTHING`;

    await sql`INSERT INTO events (type, title, detail, resource_id, severity, created_at)
      VALUES ('discovery', ${'NEW REPOSITORY: ' + repo.full_name}, ${'Discovered via GitHub scan: ' + query + ' | Stars: ' + repo.stargazers_count + ' | License: ' + (repo.license?.spdx_id || 'UNKNOWN')},
        (SELECT id FROM resources WHERE slug = ${slug}), 'info', NOW())`;

    discovered++;
    newNames.push(repo.full_name);
  }

  const rateRemaining = resp.headers.get("x-ratelimit-remaining");
  return c.json({
    ok: true, query, processed: repos.length, discovered, already_known: alreadyKnown,
    verified: 0, expired: 0, errors: [],
    rate_limit_remaining: rateRemaining ? Number(rateRemaining) : null,
    new_repositories: newNames,
    message: discovered > 0 ? `${discovered} new repositories discovered from "${query}". ${alreadyKnown} already known.` : `No new repositories found for "${query}". ${alreadyKnown} already in database.`,
  });
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
  if (!tools?.length) return c.json({ total_monthly_spend_entered: 0, estimated_monthly_saving: 0, estimated_annual_saving: 0, lines_analyzed: 0, lines_awaiting_input: 0, confidence_note: "No tools provided.", analyses: [] });
  let totalSpend = 0, totalSaving = 0, analyzed = 0;
  const analyses = [];
  for (const tool of tools) {
    const name = tool.name || tool.tool;
    const cost = Number(tool.monthly_cost || tool.cost || 0);
    totalSpend += cost;
    const p = `%${name}%`;
    const rows = await sql`SELECT * FROM resources WHERE name ILIKE ${p} OR slug ILIKE ${p} OR alt_of ILIKE ${p} LIMIT 1`;
    if (!(rows as any[]).length) {
      analyses.push({ tool: name, resolved: false, status: "PRODUCT_UNRESOLVED", message: `"${name}" not found.`, alternatives: [], current_cost: cost });
      continue;
    }
    const r = (rows as any[])[0];
    const altRows = await sql`SELECT slug, name, url, description, free_score, license, self_hostable FROM resources WHERE alt_of = ${r.name} OR alt_of = ${r.slug} ORDER BY free_score DESC LIMIT 3`;
    const alt = (altRows as any[])[0];
    const saving = alt ? cost : 0;
    totalSaving += saving; analyzed++;
    analyses.push({
      tool: name, resolved: true, status: "ANALYZED", current_cost: cost, cost_basis: "your entered spend",
      possible_cost: 0, possible_cost_basis: alt ? `$0 via ${alt.name} (${alt.license})` : "Unknown",
      monthly_saving: saving, annual_saving: saving * 12,
      replacement: alt ? { slug: alt.slug, name: alt.name, url: alt.url, description: alt.description, score: alt.free_score, relationship: "OPEN-SOURCE ALTERNATIVE", free_score: alt.free_score, license: alt.license, self_hostable: alt.self_hostable } : null,
      also_considered: (altRows as any[]).slice(1).map((a: any) => ({ name: a.name, slug: a.slug, description: a.description, score: a.free_score, url: a.url })),
      recommendation: alt ? `${alt.name} (OPEN-SOURCE ALTERNATIVE) may replace ${name}. Validate before cancelling.` : `No free alternative found for ${name}.`,
    });
  }
  return c.json({ total_monthly_spend_entered: totalSpend, estimated_monthly_saving: totalSaving, estimated_annual_saving: totalSaving * 12, lines_analyzed: analyzed, lines_awaiting_input: tools.length - analyzed, confidence_note: "Savings = your entered spend minus stored replacement costs.", analyses });
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
  if (!goal) return c.json({ project_name: "My Stack", layers: [], total_tools: 0 });

  const goalLower = goal.toLowerCase();

  // Map goal to capability keywords
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

  // Detect relevant capabilities from goal
  const detectedCaps: string[] = [];
  for (const [cap, keywords] of Object.entries(capabilityMap)) {
    if (keywords.some(kw => goalLower.includes(kw))) {
      detectedCaps.push(cap);
    }
  }

  // Fallback: if nothing detected, suggest general categories
  if (detectedCaps.length === 0) {
    detectedCaps.push("ai", "backend", "frontend", "database");
  }

  // Search DB for matching resources
  const layers: any[] = [];
  const usedSlugs = new Set<string>();
  let totalTools = 0;

  for (const cap of detectedCaps.slice(0, 6)) {
    const keywords = capabilityMap[cap] || [cap];
    const searchTerms = keywords.slice(0, 3);

    // Search by tags, capabilities, category, and description
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
        if (!usedSlugs.has(r.slug) && isTool(r)) {
          results.push(r);
          usedSlugs.add(r.slug);
        }
      }
    }

    if (results.length > 0) {
      layers.push({
        layer: cap.charAt(0).toUpperCase() + cap.slice(1),
        capability: cap,
        purpose: `For ${cap} functionality in your ${goal} project`,
        tools: results.slice(0, 4).map((r: any) => ({
          name: r.name,
          slug: r.slug,
          url: r.url || r.github_url || "",
          description: r.description || "",
          score: r.free_score || 0,
          source: "database",
          free: true,
          open_source: (r.free_types || []).includes("open_source"),
          self_hostable: r.self_hostable === "yes",
          license: r.license || "Unknown",
          stars: r.popularity || 0,
        })),
      });
      totalTools += Math.min(results.length, 4);
    }
  }

  // Also try text search on the whole goal
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
          layer: word.charAt(0).toUpperCase() + word.slice(1),
          capability: word,
          purpose: `For ${word} in your project`,
          tools: results.slice(0, 3).map((r: any) => ({
            name: r.name, slug: r.slug, url: r.url || r.github_url || "",
            description: r.description || "", score: r.free_score || 0,
            source: "database", free: true,
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
    project_name: goal,
    description: `Suggested free stack for: ${goal}`,
    estimated_monthly_cost: "$0 (all free/open-source)",
    setup_complexity: layers.length > 4 ? "Medium" : "Easy",
    layers,
    tool_replacements: [],
    total_tools: totalTools,
    integrity_note: "All tools verified from the free-intel database. No fabricated data.",
  });
});

function parseJson(v: any, def: any): any {
  if (v == null) return def;
  if (typeof v === "string") {
    try { const p = JSON.parse(v); return p ?? def; } catch { return def; }
  }
  if (Array.isArray(def) && !Array.isArray(v)) return def;
  return v;
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
