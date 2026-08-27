import { Hono } from "hono";
import { cors } from "hono/cors";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

const app = new Hono();

app.use("*", cors());

app.get("/api/health", async (c) => {
  const count = await sql`SELECT COUNT(*) as n FROM resources`;
  return c.json({ ok: true, service: "free-intel-api", version: "2.0.0", resources: Number(count[0].n) });
});

app.get("/api/resources", async (c) => {
  const { q, category, free_type, sort, limit = "50", offset = "0" } = c.req.query();

  let where = "WHERE 1=1";

  if (q) {
    const p = esc(q);
    where += ` AND (name ILIKE '%${p}%' OR description ILIKE '%${p}%' OR tags::text ILIKE '%${p}%')`;
  }
  if (category && category !== "all") {
    where += ` AND category = '${esc(category)}'`;
  }
  if (free_type && free_type !== "all") {
    where += ` AND free_types::text ILIKE '%${esc(free_type)}%'`;
  }

  const orderClause = sort === "name" ? "ORDER BY name" :
    sort === "confidence" ? "ORDER BY confidence_score DESC" :
    sort === "popular" ? "ORDER BY popularity DESC NULLS LAST" :
    sort === "newest" ? "ORDER BY created_at DESC" :
    "ORDER BY free_score DESC";

  const lim = Math.min(Number(limit) || 50, 200);
  const off = Number(offset) || 0;

  const result = await sql.unsafe(
    `SELECT * FROM resources ${where} ${orderClause} LIMIT ${lim} OFFSET ${off}`
  ) as unknown as any[];

  const countResult = await sql.unsafe(
    `SELECT COUNT(*) as n FROM resources ${where}`
  ) as unknown as any[];

  return c.json({
    count: Number(countResult[0]?.n || 0),
    items: result.map((r: any) => ({
      ...r,
      tags: typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags || [],
      capabilities: typeof r.capabilities === "string" ? JSON.parse(r.capabilities) : r.capabilities || [],
      free_types: typeof r.free_types === "string" ? JSON.parse(r.free_types) : r.free_types || [],
      source_urls: typeof r.source_urls === "string" ? JSON.parse(r.source_urls) : r.source_urls || [],
      free_score_components: typeof r.free_score_components === "string" ? JSON.parse(r.free_score_components) : r.free_score_components || {},
    })),
  });
});

app.post("/api/resources/ai-search", async (c) => {
  const { q } = await c.req.json();
  if (!q) return c.json({ count: 0, items: [] });

  const terms = q.toLowerCase().split(/\s+/);
  const conditions = terms.map((t: string) =>
    `(name ILIKE '%${esc(t)}%' OR description ILIKE '%${esc(t)}%' OR tags::text ILIKE '%${esc(t)}%' OR capabilities::text ILIKE '%${esc(t)}%' OR alt_of ILIKE '%${esc(t)}%')`
  );

  const result = await sql.unsafe(
    `SELECT *, free_score + CASE WHEN 'open_source' = ANY(SELECT jsonb_array_elements_text(free_types)) THEN 10 ELSE 0 END as relevance
     FROM resources
     WHERE ${conditions.join(" OR ")}
     ORDER BY relevance DESC
     LIMIT 50`
  ) as unknown as any[];

  return c.json({
    count: result.length,
    items: result.map((r: any) => ({
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
  const cats = await sql`SELECT category, COUNT(*) as n FROM resources WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC` as unknown as any[];
  return c.json({
    categories: cats.map((r: any) => ({ category: r.category, n: Number(r.n) })),
    types: [],
  });
});

app.get("/api/deals", async (c) => {
  const { type, category, q } = c.req.query();

  let where = "WHERE free_score >= 50";

  if (q) {
    where += ` AND (name ILIKE '%${esc(q)}%' OR description ILIKE '%${esc(q)}%' OR tags::text ILIKE '%${esc(q)}%')`;
  }
  if (category) {
    where += ` AND category ILIKE '%${esc(category)}%'`;
  }
  if (type === "free_tier") {
    where += ` AND 'free_tier' = ANY(SELECT jsonb_array_elements_text(free_types))`;
  } else if (type === "open_source") {
    where += ` AND 'open_source' = ANY(SELECT jsonb_array_elements_text(free_types))`;
  }

  const result = await sql.unsafe(
    `SELECT *, free_score as score FROM resources ${where} ORDER BY free_score DESC LIMIT 100`
  ) as unknown as any[];

  const items = result.map((r: any) => ({
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
    price_last_checked: r.price_last_checked,
  }));

  const stats = {
    total: items.length,
    free_tier: items.filter((d) => d.deal_type === "free_tier").length,
    limited_promotion: 0,
    open_source: items.filter((d) => d.deal_type === "open_source").length,
    free_credits: 0,
  };

  return c.json({ deals: items, stats, live_sources: {} });
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
