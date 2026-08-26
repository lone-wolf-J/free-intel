import { Hono } from "hono";
import { enqueueInitialDiscovery, processCrawlBatch } from "../lib/discovery";
import type { Env } from "../lib/util";

export const scansApp = new Hono<{ Bindings: Env }>();

scansApp.post("/scans/run", async (c) => {
  const requiredSecret = c.env.CRON_SECRET;
  if (requiredSecret) {
    const auth = c.req.header("Authorization") || "";
    const body = await c.req.json().catch(() => ({}) as any);
    if (auth !== `Bearer ${requiredSecret}` && body?.secret !== requiredSecret) {
      return c.json({ error: "unauthorized" }, 401);
    }
  }
  const body = await c.req.json().catch(() => ({}) as any);
  const action = String(body?.action || "batch");

  if (action === "enqueue-initial") {
    const out = await enqueueInitialDiscovery(c.env.DB, c.env);
    return c.json({ ok: true, action, ...out });
  }

  const maxFetches = Math.min(Number(body?.maxFetches) || 25, 45);
  const result = await processCrawlBatch(c.env, { maxFetches });
  return c.json({
    ok: true,
    action: "batch",
    ...result,
    message:
      result.processed === 0 && result.errors.length === 0
        ? "Queue empty. System idle — nothing was faked."
        : `Batch complete: ${result.processed} task(s), +${result.discovered} discovered, ${result.verified} verified, ${result.expired} expired.`
  });
});

scansApp.get("/daily", async (c) => {
  const evCounts = await c.env.DB.prepare(
    "SELECT type, COUNT(*) AS n FROM events WHERE created_at >= datetime('now','-1 day') GROUP BY type"
  ).all();
  const newResources = await c.env.DB.prepare(
    `SELECT slug,name,description,category,free_score,confidence_score,verification_status,origin,url
     FROM resources WHERE first_discovered >= datetime('now','-1 day') AND verification_status != 'expired'
     ORDER BY free_score DESC LIMIT 8`
  ).all();
  const expiringSoon = await c.env.DB.prepare(
    `SELECT name, slug, expires_at FROM resources
     WHERE expires_at IS NOT NULL AND expires_at >= datetime('now')
       AND expires_at <= datetime('now', '+14 days') AND verification_status != 'expired'
     ORDER BY expires_at LIMIT 10`
  ).all();
  return c.json({
    window: "24h",
    event_counts: evCounts.results || [],
    new_resources: newResources.results || [],
    expiring_soon: expiringSoon.results || [],
    note: "Counts reflect real pipeline activity only."
  });
});
