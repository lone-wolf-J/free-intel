import { Hono } from "hono";
import { cors } from "hono/cors";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

const app = new Hono();
app.use("*", cors());

app.get("/api/health", async (c) => {
  const count = await sql`SELECT COUNT(*) as n FROM resources`;
  return c.json({ ok: true, service: "free-intel-api", version: "3.0.0", resources: Number(count[0].n) });
});

app.get("/api/resources", async (c) => {
  const { q, category, free_type, sort, limit = "50", offset = "0" } = c.req.query();
  const lim = Math.min(Number(limit) || 50, 200);
  const off = Number(offset) || 0;

  let rows;
  let countRows;

  if (q && category && category !== "all" && free_type && free_type !== "all") {
    const pat = `%${q}%`;
    const ftpat = `%${free_type}%`;
    rows = await sql`SELECT * FROM resources WHERE (name ILIKE ${pat} OR description ILIKE ${pat} OR tags::text ILIKE ${pat}) AND category = ${category} AND free_types::text ILIKE ${ftpat} ORDER BY free_score DESC LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE (name ILIKE ${pat} OR description ILIKE ${pat} OR tags::text ILIKE ${pat}) AND category = ${category} AND free_types::text ILIKE ${ftpat}`;
  } else if (q && category && category !== "all") {
    const pat = `%${q}%`;
    rows = await sql`SELECT * FROM resources WHERE (name ILIKE ${pat} OR description ILIKE ${pat} OR tags::text ILIKE ${pat}) AND category = ${category} ORDER BY free_score DESC LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE (name ILIKE ${pat} OR description ILIKE ${pat} OR tags::text ILIKE ${pat}) AND category = ${category}`;
  } else if (q && free_type && free_type !== "all") {
    const pat = `%${q}%`;
    const ftpat = `%${free_type}%`;
    rows = await sql`SELECT * FROM resources WHERE (name ILIKE ${pat} OR description ILIKE ${pat} OR tags::text ILIKE ${pat}) AND free_types::text ILIKE ${ftpat} ORDER BY free_score DESC LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE (name ILIKE ${pat} OR description ILIKE ${pat} OR tags::text ILIKE ${pat}) AND free_types::text ILIKE ${ftpat}`;
  } else if (q) {
    const pat = `%${q}%`;
    rows = await sql`SELECT * FROM resources WHERE (name ILIKE ${pat} OR description ILIKE ${pat} OR tags::text ILIKE ${pat}) ORDER BY free_score DESC LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE (name ILIKE ${pat} OR description ILIKE ${pat} OR tags::text ILIKE ${pat})`;
  } else if (category && category !== "all" && free_type && free_type !== "all") {
    const ftpat = `%${free_type}%`;
    rows = await sql`SELECT * FROM resources WHERE category = ${category} AND free_types::text ILIKE ${ftpat} ORDER BY free_score DESC LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE category = ${category} AND free_types::text ILIKE ${ftpat}`;
  } else if (category && category !== "all") {
    rows = await sql`SELECT * FROM resources WHERE category = ${category} ORDER BY free_score DESC LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE category = ${category}`;
  } else if (free_type && free_type !== "all") {
    const ftpat = `%${free_type}%`;
    rows = await sql`SELECT * FROM resources WHERE free_types::text ILIKE ${ftpat} ORDER BY free_score DESC LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources WHERE free_types::text ILIKE ${ftpat}`;
  } else {
    const order = sort === "name" ? sql`ORDER BY name`
      : sort === "confidence" ? sql`ORDER BY confidence_score DESC`
      : sort === "popular" ? sql`ORDER BY popularity DESC NULLS LAST`
      : sort === "newest" ? sql`ORDER BY created_at DESC`
      : sql`ORDER BY free_score DESC`;
    rows = await sql`SELECT * FROM resources ${order} LIMIT ${lim} OFFSET ${off}`;
    countRows = await sql`SELECT COUNT(*) as n FROM resources`;
  }

  const items = (rows as any[]).map((r: any) => ({
    ...r,
    tags: typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags || [],
    capabilities: typeof r.capabilities === "string" ? JSON.parse(r.capabilities) : r.capabilities || [],
    free_types: typeof r.free_types === "string" ? JSON.parse(r.free_types) : r.free_types || [],
    source_urls: typeof r.source_urls === "string" ? JSON.parse(r.source_urls) : r.source_urls || [],
    free_score_components: typeof r.free_score_components === "string" ? JSON.parse(r.free_score_components) : r.free_score_components || {},
  }));

  return c.json({ count: Number((countRows as any)[0]?.n || 0), items });
});

app.post("/api/resources/ai-search", async (c) => {
  const { q } = await c.req.json();
  if (!q) return c.json({ count: 0, items: [] });

  const terms = q.toLowerCase().split(/\s+/);
  const pat = terms.map((t: string) => `%${t}%`);

  const result = await sql`
    SELECT *, free_score + CASE WHEN 'open_source' = ANY(SELECT jsonb_array_elements_text(free_types)) THEN 10 ELSE 0 END as relevance
    FROM resources
    WHERE name ILIKE ${pat[0]} OR description ILIKE ${pat[0]} OR tags::text ILIKE ${pat[0]}
       OR name ILIKE ${pat[1] || pat[0]} OR description ILIKE ${pat[1] || pat[0]} OR tags::text ILIKE ${pat[1] || pat[0]}
       OR name ILIKE ${pat[2] || pat[0]} OR description ILIKE ${pat[2] || pat[0]} OR tags::text ILIKE ${pat[2] || pat[0]}
       OR name ILIKE ${pat[3] || pat[0]} OR description ILIKE ${pat[3] || pat[0]} OR tags::text ILIKE ${pat[3] || pat[0]}
    ORDER BY relevance DESC
    LIMIT 50`;

  return c.json({
    count: (result as any[]).length,
    items: (result as any[]).map((r: any) => ({
      ...r,
      tags: typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags || [],
      capabilities: typeof r.capabilities === "string" ? JSON.parse(r.capabilities) : r.capabilities || [],
      free_types: typeof r.free_types === "string" ? JSON.parse(r.free_types) : r.free_types || [],
      source_urls: typeof r.source_urls === "string" ? JSON.parse(r.source_urls) : r.source_urls || [],
    })),
    query: q,
    expanded_terms: terms,
  });
});

app.get("/api/resources/facets", async (c) => {
  const cats = await sql`SELECT category, COUNT(*) as n FROM resources WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC`;
  return c.json({
    categories: (cats as any[]).map((r: any) => ({ category: r.category, n: Number(r.n) })),
    types: [],
  });
});

app.get("/api/deals", async (c) => {
  const { type, category, q } = c.req.query();

  let deals;
  if (type === "open_source") {
    deals = await sql`SELECT *, free_score as score FROM resources WHERE free_score >= 50 AND 'open_source' = ANY(SELECT jsonb_array_elements_text(free_types)) ORDER BY free_score DESC LIMIT 100`;
  } else if (type === "free_tier") {
    deals = await sql`SELECT *, free_score as score FROM resources WHERE free_score >= 50 AND NOT ('open_source' = ANY(SELECT jsonb_array_elements_text(free_types))) ORDER BY free_score DESC LIMIT 100`;
  } else if (q) {
    const pat = `%${q}%`;
    deals = await sql`SELECT *, free_score as score FROM resources WHERE free_score >= 50 AND (name ILIKE ${pat} OR description ILIKE ${pat} OR tags::text ILIKE ${pat}) ORDER BY free_score DESC LIMIT 100`;
  } else {
    deals = await sql`SELECT *, free_score as score FROM resources WHERE free_score >= 50 ORDER BY free_score DESC LIMIT 100`;
  }

  const items = (deals as any[]).map((r: any) => ({
    id: r.slug,
    name: r.name,
    description: r.description,
    category: r.category || "General",
    deal_type: (r.free_types && Array.isArray(r.free_types) && r.free_types.includes("open_source")) ? "open_source" : "free_tier",
    score: r.free_score || 0,
    tags: typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags || [],
    url: r.url || r.github_url,
    source: "free-intel-db",
    provider: r.provider,
    free_types: typeof r.free_types === "string" ? JSON.parse(r.free_types) : r.free_types || [],
    free_allowance: r.free_allowance,
    card_required: r.card_required,
    self_hostable: r.self_hostable,
    commercial_use: r.commercial_use,
  }));

  return c.json({
    deals: items,
    stats: {
      total: items.length,
      free_tier: items.filter((d) => d.deal_type === "free_tier").length,
      limited_promotion: 0,
      open_source: items.filter((d) => d.deal_type === "open_source").length,
      free_credits: 0,
    },
    live_sources: {},
  });
});

app.post("/api/stacks/generate", async (c) => {
  const { goal } = await c.req.json();
  return c.json({
    project_name: goal || "My Stack",
    description: `Stack for: ${goal}`,
    estimated_monthly_cost: "Varies",
    setup_complexity: "Medium",
    layers: [],
  });
});

export default app;
