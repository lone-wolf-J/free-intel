import { Hono } from "hono";
import { nowISO } from "../lib/util";
import { enqueueInitialDiscovery, processCrawlBatch } from "../lib/discovery";
import type { Env } from "../lib/util";

export const radarApp = new Hono<{ Bindings: Env }>();

radarApp.get("/radar/events", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") || 30), 100);
  const rows = await c.env.DB.prepare(
    `SELECT e.*, r.slug AS resource_slug, r.name AS resource_name
     FROM events e LEFT JOIN resources r ON r.id = e.resource_id
     ORDER BY e.created_at DESC, e.id DESC LIMIT ?`
  )
    .bind(limit)
    .all();
  return c.json({ events: rows.results || [] });
});

radarApp.get("/radar/status", async (c) => {
  const lastScan = await c.env.DB.prepare("SELECT * FROM scans ORDER BY id DESC LIMIT 1").first();
  const counts = await c.env.DB.prepare(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) AS verified,
      SUM(CASE WHEN verification_status IN ('discovered','unverified') THEN 1 ELSE 0 END) AS unverified,
      SUM(CASE WHEN github_url IS NOT NULL THEN 1 ELSE 0 END) AS github,
      SUM(CASE WHEN license IS NOT NULL AND license IN ('MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','GPL-2.0','GPL-3.0','AGPL-3.0','MPL-2.0','ISC') THEN 1 ELSE 0 END) AS open_source,
      SUM(CASE WHEN expires_at IS NOT NULL AND verification_status != 'expired' THEN 1 ELSE 0 END) AS expiring,
      SUM(CASE WHEN alt_of IS NOT NULL THEN 1 ELSE 0 END) AS alternatives
     FROM resources`
  ).first();
  const sources = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM sources WHERE active=1").first();
  const events24 = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE created_at >= datetime('now','-1 day')").first();
  const tasks = await c.env.DB.prepare(
    `SELECT status, COUNT(*) AS n FROM crawl_tasks GROUP BY status`
  ).all();
  return c.json({
    last_scan: lastScan || null,
    resources: counts,
    active_sources: sources?.n ?? 0,
    events_24h: events24?.n ?? 0,
    crawl_queue: tasks.results || [],
    server_time: nowISO()
  });
});

radarApp.post("/radar/github-scan", async (c) => {
  const body = await c.req.json().catch(() => ({}) as any);
  const query = String(body?.query || "").slice(0, 200);
  if (!query) return c.json({ error: "query_required" }, 400);
  const { enqueue, processCrawlBatch } = await import("../lib/discovery");
  await enqueue(c.env.DB, "github_search", { q: query, label: query, category: "Manual sweep" }, 1);
  const result = await processCrawlBatch(c.env, { maxFetches: 3 });
  return c.json({
    ok: true,
    query,
    ...result,
    message:
      result.discovered > 0
        ? `${result.discovered} new repositories discovered and published with source evidence.`
        : result.errors.length
        ? `Sweep ran but found nothing new. ${result.errors[0]}`
        : "Sweep complete — nothing new beyond what is already in the database."
  });
});
