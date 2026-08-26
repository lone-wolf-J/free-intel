/// <reference types="node" />
try { (process as any).loadEnvFile?.(); } catch { /* no .env file present */ }
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { readFileSync } from "node:fs";
import { openD1FromFile } from "../server/d1-node";
import { makeEnsureSchema } from "../server/db/init";
import { enqueueInitialDiscovery, processCrawlBatch } from "../server/lib/discovery";

const stateDir = process.env.FI_STATE_DIR || path.join(os.homedir(), ".fi-d1-state");
const dbFile = path.join(stateDir, "freeintel.sqlite");

if (existsSync(dbFile)) {
  rmSync(dbFile, { force: true });
  console.log("[bootstrap] wiped existing database:", dbFile);
}

const schema = readFileSync(path.join(process.cwd(), "server", "db", "schema.sql"), "utf8");
const db = openD1FromFile(dbFile);
const ensureSchema = makeEnsureSchema(schema);
await ensureSchema(db);
console.log("[bootstrap] fresh schema created — database starts EMPTY");

const env = {
  DB: db,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY
};

const init = await enqueueInitialDiscovery(db, env);
console.log(`[bootstrap] discovery queue seeded: ${init.pending} task(s)`);

const delayMs = env.GITHUB_TOKEN ? 1200 : 7000;
const maxMinutes = Number(process.argv[2] || 8);
const deadline = Date.now() + maxMinutes * 60_000;

let totalDiscovered = 0;
let totalProcessed = 0;
let stallBatches = 0;

while (Date.now() < deadline) {
  const before = await db.prepare("SELECT COUNT(*) AS n FROM crawl_tasks WHERE status='pending'").first();
  const res = await processCrawlBatch(env, { maxFetches: 6, delayMs });
  totalDiscovered += res.discovered;
  totalProcessed += res.processed;
  const after = await db.prepare("SELECT COUNT(*) AS n FROM crawl_tasks WHERE status='pending'").first();

  console.log(
    `[bootstrap] batch: ${res.processed} tasks · +${res.discovered} discovered · pending ${Number(after?.n || 0)}${
      res.errors.length ? ` · errors: ${res.errors[0].slice(0, 90)}` : ""
    }`
  );

  const stalled = Number(after?.n || 0) > 0 && res.processed <= res.errors.length;
  stallBatches = stalled ? stallBatches + 1 : 0;
  if (stallBatches >= 3) {
    console.log("[bootstrap] stopping: rate-limited with no progress. Re-run later or set GITHUB_TOKEN.");
    break;
  }
  if (!after?.n) {
    console.log("[bootstrap] queue fully drained.");
    break;
  }
}

const stats = await db.prepare(
  `SELECT
     (SELECT COUNT(*) FROM resources) AS resources,
     (SELECT COUNT(*) FROM resources WHERE verification_status='verified') AS verified,
     (SELECT COUNT(*) FROM evidence) AS evidence,
     (SELECT COUNT(*) FROM events) AS events,
     (SELECT COUNT(*) FROM crawl_tasks WHERE status='pending') AS queue_pending`
).first();

console.log("\n[bootstrap] RESULT ─────────────────────────");
console.log(`  batches processed : ${totalProcessed}`);
console.log(`  real resources    : ${stats?.resources}`);
console.log(`  verified          : ${stats?.verified}`);
console.log(`  evidence records  : ${stats?.evidence}`);
console.log(`  radar events      : ${stats?.events}`);
console.log(`  tasks still queued: ${stats?.queue_pending} (hourly cron will continue them in production)`);
