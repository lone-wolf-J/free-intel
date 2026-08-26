try { process.loadEnvFile(); } catch {}
import { openD1FromFile } from '../server/d1-node.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { processCrawlBatch } from '../server/lib/discovery.js';
const here = dirname(fileURLToPath(import.meta.url));
const stateDir = process.env.FI_STATE_DIR || join(process.env.HOME || '', '.fi-d1-state');
const dbFile = join(stateDir, 'freeintel.sqlite');
const db = openD1FromFile(dbFile);
const env = { DB: db, GITHUB_TOKEN: process.env.GITHUB_TOKEN, GEMINI_API_KEY: process.env.GEMINI_API_KEY };

console.log('[drain] Starting aggressive drain of 321 tasks...');
let total = 0;
let batch = 0;
while (batch < 60) {
  const pending = await db.prepare("SELECT COUNT(*) as n FROM crawl_tasks WHERE status='pending'").first();
  if (!pending?.n || Number(pending.n) === 0) { console.log('[drain] Queue drained!'); break; }
  console.log(`[drain] Batch ${++batch}: ${pending.n} pending`);
  const result = await processCrawlBatch(env, { maxFetches: 30, delayMs: 600 });
  total += result.processed;
  console.log(`  -> processed=${result.processed} discovered=${result.discovered} errors=${result.errors.length} (total: ${total})`);
  if (result.errors.length > 0) console.log(`  -> sample error: ${result.errors[0]}`);
  if (result.processed === 0) { console.log('[drain] Stalled.'); break; }
}
const res = await db.prepare('SELECT COUNT(*) as n FROM resources').first();
const q = await db.prepare("SELECT status, COUNT(*) as n FROM crawl_tasks GROUP BY status").all();
console.log(`\n[drain] Final: ${res?.n} resources`);
console.log(`[drain] Queue: ${JSON.stringify(q.results)}`);
