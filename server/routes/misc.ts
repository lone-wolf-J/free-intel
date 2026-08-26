import { Hono } from "hono";
import { nowISO } from "../lib/util";
import { slugify, addEvidence, registerAlias, logEvent } from "../lib/upsert";
import { autoVerifySlug } from "../lib/discovery";
import type { Env } from "../lib/util";

export const miscApp = new Hono<{ Bindings: Env }>();

miscApp.post("/submissions", async (c) => {
  const b = await c.req.json().catch(() => ({}) as any);
  const url = String(b?.url || "").trim();
  if (!/^https?:\/\/.+\..+/.test(url)) return c.json({ error: "valid_url_required" }, 400);
  const name = String(b?.name || "").slice(0, 120);

  const res = await c.env.DB.prepare(
    `INSERT INTO submissions (url,name,description,why_useful,status,analysis_notes)
     VALUES (?,?,?,?, 'verification', ?)`
  )
    .bind(url, name, String(b?.description || "").slice(0, 600), String(b?.why_useful || "").slice(0, 600),
      "Queued for independent verification. Nothing is published automatically.")
    .run();

  await logEvent(c.env.DB, "submission", "USER SUBMISSION RECEIVED", `${name || url} entered the verification queue.`, null);

  const { enqueue } = await import("../lib/discovery");
  if (/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(url)) {
    const m = url.match(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/)!;
    await enqueue(c.env.DB, "github_repo", { full_name: m[1].replace(/\.git$/, ""), via: "user-submission" }, 2);
  } else {
    await enqueue(c.env.DB, "verify_resource", { submission_url: url }, 4);
  }

  return c.json({
    ok: true,
    id: res.meta.last_row_id,
    status: "verification",
    message: "Submission captured. The engine will independently fetch and verify it before anything is published."
  });
});

miscApp.get("/admin/overview", async (c) => {
  const byStatus = await c.env.DB.prepare(
    "SELECT verification_status AS s, COUNT(*) AS n FROM resources GROUP BY verification_status"
  ).all();
  const lowConfidence = await c.env.DB.prepare(
    "SELECT slug,name,confidence_score,verification_status FROM resources WHERE confidence_score < 50 AND verification_status != 'expired' ORDER BY confidence_score ASC LIMIT 20"
  ).all();
  const sources = await c.env.DB.prepare("SELECT * FROM sources ORDER BY tier, reliability DESC").all();
  const subs = await c.env.DB.prepare("SELECT * FROM submissions ORDER BY created_at DESC LIMIT 30").all();
  const dupes = await c.env.DB.prepare(
    `SELECT LOWER(TRIM(name)) AS norm, COUNT(*) AS n, GROUP_CONCAT(slug) AS slugs
     FROM resources GROUP BY norm HAVING n > 1 LIMIT 20`
  ).all();
  const scans = await c.env.DB.prepare("SELECT * FROM scans ORDER BY id DESC LIMIT 10").all();
  const queue = await c.env.DB.prepare("SELECT status, COUNT(*) AS n FROM crawl_tasks GROUP BY status").all();
  const recentErrors = await c.env.DB.prepare(
    "SELECT kind,payload,last_error,attempts FROM crawl_tasks WHERE status='error' ORDER BY id DESC LIMIT 10"
  ).all();

  return c.json({
    status_counts: byStatus.results,
    low_confidence: lowConfidence.results,
    sources: sources.results,
    submissions: subs.results,
    duplicates: dupes.results,
    recent_scans: scans.results,
    crawl_queue: queue.results,
    recent_task_errors: recentErrors.results,
    db_time: nowISO()
  });
});

miscApp.post("/admin/submissions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const b = await c.req.json().catch(() => ({}) as any);
  const action = String(b?.action || "");
  const sub = await c.env.DB.prepare("SELECT * FROM submissions WHERE id=?").bind(id).first();
  if (!sub) return c.json({ error: "not_found" }, 404);

  if (action === "approve") {
    const name = String(sub.name || new URL(String(sub.url)).hostname).slice(0, 120);
    const { upsertResource } = await import("../lib/upsert");
    const { id: rid, created } = await upsertResource(c.env.DB, {
      slug: `${slugify(name)}-${id}`,
      name,
      description: String(sub.description || sub.why_useful || "").slice(0, 500),
      url: String(sub.url),
      origin: "user"
    });
    if (created) {
      await addEvidence(c.env.DB, rid, "Submitted by a user; independent verification pending", String(sub.url), null, "user_submission", 20);
      await registerAlias(c.env.DB, name, rid).catch(() => {});
    }
    await c.env.DB.prepare("UPDATE submissions SET status='approved', analysis_notes=analysis_notes||' | Approved; queued for crawler verification.' WHERE id=?").bind(id).run();
    await logEvent(c.env.DB, "system", "SUBMISSION APPROVED INTO CRAWL QUEUE", `${name} — still requires successful verification before publishing.`, rid, "warn");
    return c.json({ ok: true, status: "approved" });
  }

  if (action === "reject") {
    await c.env.DB.prepare("UPDATE submissions SET status='rejected', analysis_notes=analysis_notes||' | Rejected by operator.' WHERE id=?").bind(id).run();
    return c.json({ ok: true, status: "rejected" });
  }
  return c.json({ error: "unknown_action" }, 400);
});

miscApp.post("/admin/resources/:slug", async (c) => {
  const slug = c.req.param("slug");
  const b = await c.req.json().catch(() => ({}) as any);
  const action = String(b?.action || "");

  if (action === "autoverify") {
    const out = await autoVerifySlug(c.env.DB, c.env, slug);
    return c.json({ ok: true, action, slug, ...out });
  }

  if (action === "expire") {
    await c.env.DB.prepare("UPDATE resources SET verification_status='expired', updated_at=datetime('now') WHERE slug=?").bind(slug).run();
    await logEvent(c.env.DB, "expiration", "RESOURCE EXPIRED (OPERATOR)", `${slug} manually expired. Retained historically.`, null, "critical");
    return c.json({ ok: true, action, slug });
  }

  if (action === "reset") {
    await c.env.DB.prepare("UPDATE resources SET verification_status='discovered', last_verified=NULL, updated_at=datetime('now') WHERE slug=?").bind(slug).run();
    return c.json({ ok: true, action, slug });
  }

  return c.json({ error: "unknown_action" }, 400);
});

miscApp.post("/admin/sources/:id/toggle", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("UPDATE sources SET active = 1 - active WHERE id=?").bind(id).run();
  return c.json({ ok: true });
});
