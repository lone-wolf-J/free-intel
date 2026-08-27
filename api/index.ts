import { Hono } from "hono";
import { cors } from "hono/cors";
import { neon } from "@neondatabase/serverless";
import { DEALS_SEED } from "../server/db/deals-seed";

const sql = neon(process.env.POSTGRES_URL!);

const app = new Hono();

app.use("*", cors());

app.get("/api/health", (c) =>
  c.json({ ok: true, service: "free-intel-api", version: "1.0.0" })
);

app.get("/api/resources", async (c) => {
  const { q, category, free_type, sort, limit = "50", offset = "0" } = c.req.query();

  let where = "WHERE 1=1";
  const params: any[] = [];

  if (q) {
    params.push(`%${q}%`);
    where += ` AND (name ILIKE '${params[params.length - 1]}' OR description ILIKE '${params[params.length - 1]}' OR tags::text ILIKE '${params[params.length - 1]}')`;
  }
  if (category && category !== "all") {
    params.push(category);
    where += ` AND category = '${params[params.length - 1]}'`;
  }
  if (free_type && free_type !== "all") {
    params.push(`%${free_type}%`);
    where += ` AND free_types::text ILIKE '${params[params.length - 1]}'`;
  }

  const orderClause = sort === "name" ? "ORDER BY name" :
    sort === "confidence" ? "ORDER BY confidence_score DESC" :
    sort === "popular" ? "ORDER BY popularity DESC NULLS LAST" :
    sort === "newest" ? "ORDER BY created_at DESC" :
    "ORDER BY free_score DESC";

  const result = await sql.unsafe(
    `SELECT * FROM resources ${where} ${orderClause} LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
  );

  const countResult = await sql.unsafe(
    `SELECT COUNT(*) as n FROM resources ${where}`
  );

  return c.json({
    count: Number((countResult as any)[0]?.n || 0),
    items: (result as any[]).map((r: any) => ({
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
    `(name ILIKE '%${t}%' OR description ILIKE '%${t}%' OR tags::text ILIKE '%${t}%' OR capabilities::text ILIKE '%${t}%' OR alt_of ILIKE '%${t}%')`
  );

  const result = await sql.unsafe(
    `SELECT *, free_score + CASE WHEN 'open_source' = ANY(SELECT jsonb_array_elements_text(free_types)) THEN 10 ELSE 0 END as relevance
     FROM resources
     WHERE ${conditions.join(" OR ")}
     ORDER BY relevance DESC
     LIMIT 50`
  );

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
  const cats = await sql.unsafe(`SELECT category, COUNT(*) as n FROM resources WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC`);
  return c.json({
    categories: (cats as any[]).map((r: any) => ({ category: r.category, n: Number(r.n) })),
    types: [],
  });
});

app.get("/api/deals", async (c) => {
  const { type, category, q } = c.req.query();
  let deals = [...DEALS_SEED];

  if (type && type !== "all") {
    deals = deals.filter((d) => d.deal_type === type);
  }
  if (category) {
    deals = deals.filter((d) => d.category.toLowerCase().includes(category.toLowerCase()));
  }
  if (q) {
    const lower = q.toLowerCase();
    deals = deals.filter((d) =>
      d.name.toLowerCase().includes(lower) ||
      d.description.toLowerCase().includes(lower) ||
      d.tags.some((t) => t.includes(lower))
    );
  }

  deals.sort((a, b) => b.score - a.score);

  const stats = {
    total: deals.length,
    free_tier: deals.filter((d) => d.deal_type === "free_tier").length,
    limited_promotion: deals.filter((d) => d.deal_type === "limited_promotion").length,
    open_source: deals.filter((d) => d.deal_type === "open_source").length,
    free_credits: deals.filter((d) => d.deal_type === "free_credits").length,
  };

  return c.json({ deals, stats, live_sources: { hackernews: 0, reddit: 0, producthunt: 0, github: 0, directories: 0 } });
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
