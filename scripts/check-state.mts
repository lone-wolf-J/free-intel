try { process.loadEnvFile(); } catch {}
import { openD1FromFile } from '../server/d1-node.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const here = dirname(fileURLToPath(import.meta.url));
const stateDir = process.env.FI_STATE_DIR || join(process.env.HOME || '', '.fi-d1-state');
const dbFile = join(stateDir, 'freeintel.sqlite');
const db = openD1FromFile(dbFile);
async function main() {
  const r = await db.prepare('SELECT COUNT(*) as n FROM resources').first();
  const cats = await db.prepare('SELECT category, COUNT(*) as n FROM resources GROUP BY category ORDER BY n DESC').all();
  const q = await db.prepare("SELECT status, COUNT(*) as n FROM crawl_tasks GROUP BY status").all();
  const pending = await db.prepare("SELECT kind, COUNT(*) as n FROM crawl_tasks WHERE status='pending' GROUP BY kind").all();
  const errors = await db.prepare("SELECT kind, COUNT(*) as n FROM crawl_tasks WHERE status='failed' GROUP BY kind").all();
  const srcStats = await db.prepare("SELECT type, COUNT(*) as n FROM sources GROUP BY type").all();
  console.log(`Total resources: ${r?.n}`);
  console.log(`Categories: ${JSON.stringify(cats.results)}`);
  console.log(`Queue: ${JSON.stringify(q.results)}`);
  console.log(`Pending by kind: ${JSON.stringify(pending.results)}`);
  console.log(`Failed by kind: ${JSON.stringify(errors.results)}`);
  console.log(`Sources: ${JSON.stringify(srcStats.results)}`);
}
main();
