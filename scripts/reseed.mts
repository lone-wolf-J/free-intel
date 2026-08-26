try { process.loadEnvFile(); } catch {}
import { openD1FromFile } from '../server/d1-node.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { seedSourceRegistry } from '../server/lib/discovery.js';
const here = dirname(fileURLToPath(import.meta.url));
const stateDir = process.env.FI_STATE_DIR || join(process.env.HOME || '', '.fi-d1-state');
const dbFile = join(stateDir, 'freeintel.sqlite');
const db = openD1FromFile(dbFile);

async function main() {
  // Wipe sources and crawl_tasks to re-seed
  await db.exec('DELETE FROM sources');
  await db.exec('DELETE FROM crawl_tasks');
  console.log('Wiped sources and crawl_tasks');

  // Re-seed
  const env = { DB: db, GITHUB_TOKEN: process.env.GITHUB_TOKEN, GEMINI_API_KEY: process.env.GEMINI_API_KEY };
  const result = await seedSourceRegistry(db);
  console.log('Re-seeded:', JSON.stringify(result));

  // Count
  const srcs = await db.prepare('SELECT COUNT(*) as n FROM sources').first();
  const tasks = await db.prepare('SELECT kind, COUNT(*) as n FROM crawl_tasks GROUP BY kind').all();
  console.log(`Sources: ${srcs?.n}`);
  console.log('Tasks by kind:', JSON.stringify(tasks.results));
}
main();
