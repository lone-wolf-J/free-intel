try { process.loadEnvFile(); } catch {}
import { neon } from "@neondatabase/serverless";
import { openD1FromFile } from "../server/d1-node.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const stateDir = process.env.FI_STATE_DIR || join(process.env.HOME || '', '.fi-d1-state');
const dbFile = join(stateDir, 'freeintel.sqlite');
const sqlite = openD1FromFile(dbFile);

const POSTGRES_URL = process.argv[2] || process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
  console.error("Usage: npx tsx scripts/migrate-to-neon.ts <POSTGRES_URL>");
  process.exit(1);
}

const sql = neon(POSTGRES_URL);

function sj(s: unknown): string {
  if (s == null) return "[]";
  const str = String(s).trim();
  if (!str || str === "null") return "[]";
  try {
    let v = JSON.parse(str);
    if (typeof v === "string") { try { v = JSON.parse(v); } catch {} }
    return JSON.stringify(Array.isArray(v) ? v : (v ?? []));
  } catch { return "[]"; }
}

function sobj(s: unknown): string {
  if (s == null) return "{}";
  const str = String(s).trim();
  if (!str || str === "null") return "{}";
  try {
    let v = JSON.parse(str);
    if (typeof v === "string") { try { v = JSON.parse(v); } catch {} }
    if (v && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
    return "{}";
  } catch { return "{}"; }
}

async function ensurePgSchema() {
  console.log("[pg] Creating schema...");
  await sql`CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    provider TEXT,
    capability TEXT,
    category TEXT,
    subcategory TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    capabilities JSONB DEFAULT '[]'::jsonb,
    url TEXT,
    source_urls JSONB DEFAULT '[]'::jsonb,
    announcement_url TEXT,
    docs_url TEXT,
    pricing_url TEXT,
    github_url TEXT,
    resource_type TEXT DEFAULT 'unknown',
    free_types JSONB DEFAULT '[]'::jsonb,
    free_allowance TEXT,
    free_limits TEXT,
    personal_use TEXT DEFAULT 'unknown',
    commercial_use TEXT DEFAULT 'unknown',
    license TEXT,
    card_required TEXT DEFAULT 'unknown',
    self_hostable TEXT DEFAULT 'unknown',
    infrastructure_note TEXT,
    infra_cost_month REAL,
    alt_of TEXT,
    alt_kind TEXT,
    expires_at TEXT,
    plans_json JSONB,
    price_last_checked TEXT,
    first_discovered TEXT,
    last_verified TEXT,
    verification_status TEXT DEFAULT 'discovered',
    content_hash TEXT,
    last_content_check TEXT,
    free_score INTEGER DEFAULT 0,
    free_score_components JSONB DEFAULT '{}'::jsonb,
    confidence_score INTEGER DEFAULT 0,
    popularity INTEGER,
    forks INTEGER,
    github_last_push TEXT,
    security_notes TEXT,
    difficulty TEXT DEFAULT 'unknown',
    origin TEXT DEFAULT 'crawler',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    domain TEXT,
    type TEXT DEFAULT 'rss',
    category TEXT,
    tier INTEGER DEFAULT 2,
    frequency_hours INTEGER DEFAULT 24,
    parser TEXT DEFAULT 'rss-generic',
    reliability INTEGER DEFAULT 60,
    active INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    discovery_method TEXT DEFAULT 'seed-registry',
    last_checked TEXT,
    last_changed TEXT
  )`;

  await sql`CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT,
    resource_id INTEGER,
    severity TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    claim TEXT NOT NULL,
    source_url TEXT,
    evidence_text TEXT,
    retrieved_at TIMESTAMPTZ DEFAULT NOW(),
    method TEXT DEFAULT 'http',
    confidence INTEGER DEFAULT 50
  )`;

  await sql`CREATE TABLE IF NOT EXISTS product_aliases (
    alias_lower TEXT PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  console.log("[pg] Schema ready");
}

async function migrateResources() {
  console.log("[sqlite] Reading resources...");
  const rows = await sqlite.prepare("SELECT * FROM resources").all();
  const items = rows.results || [];
  console.log(`[sqlite] Found ${items.length} resources`);

  await sql`DELETE FROM resources`;
  console.log("[pg] Cleared existing resources");

  let inserted = 0;
  const BATCH = 25;

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const promises = batch.map(r => {
      return sql`INSERT INTO resources (
        slug, name, description, provider, capability, category, subcategory,
        tags, capabilities, url, source_urls, announcement_url, docs_url,
        pricing_url, github_url, resource_type, free_types, free_allowance,
        free_limits, personal_use, commercial_use, license, card_required,
        self_hostable, infrastructure_note, infra_cost_month, alt_of, alt_kind,
        expires_at, plans_json, price_last_checked, first_discovered,
        last_verified, verification_status, content_hash, last_content_check,
        free_score, free_score_components, confidence_score, popularity, forks,
        github_last_push, security_notes, difficulty, origin, created_at, updated_at
      ) VALUES (
        ${r.slug}, ${r.name}, ${r.description || ""}, ${r.provider},
        ${r.capability}, ${r.category}, ${r.subcategory},
        ${sj(r.tags)}, ${sj(r.capabilities)},
        ${r.url}, ${sj(r.source_urls)},
        ${r.announcement_url}, ${r.docs_url}, ${r.pricing_url}, ${r.github_url},
        ${r.resource_type || "unknown"}, ${sj(r.free_types)},
        ${r.free_allowance}, ${r.free_limits}, ${r.personal_use || "unknown"},
        ${r.commercial_use || "unknown"}, ${r.license}, ${r.card_required || "unknown"},
        ${r.self_hostable || "unknown"}, ${r.infrastructure_note},
        ${r.infra_cost_month}, ${r.alt_of}, ${r.alt_kind}, ${r.expires_at},
        ${sobj(r.plans_json)}, ${r.price_last_checked},
        ${r.first_discovered}, ${r.last_verified},
        ${r.verification_status || "discovered"}, ${r.content_hash},
        ${r.last_content_check}, ${r.free_score || 0},
        ${sobj(r.free_score_components)}, ${r.confidence_score || 30},
        ${r.popularity}, ${r.forks}, ${r.github_last_push},
        ${r.security_notes}, ${r.difficulty || "unknown"}, ${r.origin || "crawler"},
        ${r.created_at}, ${r.updated_at}
      ) ON CONFLICT (slug) DO NOTHING`;
    });

    await Promise.all(promises);
    inserted += batch.length;
    process.stdout.write(`  [pg] ${inserted}/${items.length} resources...\r`);
  }

  console.log(`\n[pg] Inserted ${inserted} resources`);
}

async function migrateSources() {
  console.log("[sqlite] Reading sources...");
  const rows = await sqlite.prepare("SELECT * FROM sources").all();
  const items = rows.results || [];
  console.log(`[sqlite] Found ${items.length} sources`);

  await sql`DELETE FROM sources`;

  let inserted = 0;
  const BATCH = 50;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    await Promise.all(batch.map(s =>
      sql`INSERT INTO sources (name, url, domain, type, category, tier, frequency_hours, parser, reliability, active, status, error_count, last_error, discovery_method, last_checked, last_changed)
        VALUES (${s.name}, ${s.url}, ${s.domain}, ${s.type || "rss"}, ${s.category}, ${s.tier || 2}, ${s.frequency_hours || 24}, ${s.parser || "rss-generic"}, ${s.reliability || 60}, ${s.active ?? 1}, ${s.status || "active"}, ${s.error_count || 0}, ${s.last_error}, ${s.discovery_method || "seed-registry"}, ${s.last_checked}, ${s.last_changed})
        ON CONFLICT (url) DO NOTHING`
    ));
    inserted += batch.length;
    process.stdout.write(`  [pg] ${inserted}/${items.length} sources...\r`);
  }
  console.log(`\n[pg] Inserted ${inserted} sources`);
}

async function migrateEvents() {
  console.log("[sqlite] Reading events...");
  const rows = await sqlite.prepare("SELECT * FROM events ORDER BY id DESC LIMIT 500").all();
  const items = rows.results || [];
  console.log(`[sqlite] Found ${items.length} events`);

  await sql`DELETE FROM events`;
  for (const e of items) {
    await sql`INSERT INTO events (type, title, detail, resource_id, severity, created_at)
      VALUES (${e.type}, ${e.title}, ${e.detail}, ${e.resource_id}, ${e.severity || "info"}, ${e.created_at})`;
  }
  console.log(`[pg] Inserted ${items.length} events`);
}

async function migrateEvidence() {
  console.log("[sqlite] Reading evidence...");
  const rows = await sqlite.prepare("SELECT * FROM evidence").all();
  const items = rows.results || [];
  console.log(`[sqlite] Found ${items.length} evidence`);

  await sql`DELETE FROM evidence`;
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    await Promise.all(batch.map(ev =>
      sql`INSERT INTO evidence (resource_id, claim, source_url, evidence_text, retrieved_at, method, confidence)
        VALUES (${ev.resource_id}, ${ev.claim}, ${ev.source_url}, ${ev.evidence_text}, ${ev.retrieved_at}, ${ev.method || "http"}, ${ev.confidence || 50})`
    ));
    inserted += batch.length;
    process.stdout.write(`  [pg] ${inserted}/${items.length} evidence...\r`);
  }
  console.log(`\n[pg] Inserted ${inserted} evidence`);
}

async function migrateAliases() {
  console.log("[sqlite] Reading aliases...");
  const rows = await sqlite.prepare("SELECT * FROM product_aliases").all();
  const items = rows.results || [];
  console.log(`[sqlite] Found ${items.length} aliases`);

  await sql`DELETE FROM product_aliases`;
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    await Promise.all(batch.map(a =>
      sql`INSERT INTO product_aliases (alias_lower, resource_id, created_at)
        VALUES (${a.alias_lower}, ${a.resource_id}, ${a.created_at})
        ON CONFLICT DO NOTHING`
    ));
    inserted += batch.length;
    process.stdout.write(`  [pg] ${inserted}/${items.length} aliases...\r`);
  }
  console.log(`\n[pg] Inserted ${inserted} aliases`);
}

async function main() {
  console.log("=== SQLite → Neon Postgres Migration ===");
  console.log(`Source: ${dbFile}`);
  console.log(`Target: ${POSTGRES_URL!.split("@")[1]?.split("?")[0] || "neon"}`);

  await ensurePgSchema();
  await migrateResources();
  await migrateSources();
  await migrateEvents();
  await migrateEvidence();
  await migrateAliases();

  const count = await sql`SELECT COUNT(*) as n FROM resources`;
  console.log(`\n=== Migration Complete ===`);
  console.log(`Resources in Neon: ${count[0].n}`);

  const srcCount = await sql`SELECT COUNT(*) as n FROM sources`;
  console.log(`Sources in Neon: ${srcCount[0].n}`);

  const evCount = await sql`SELECT COUNT(*) as n FROM events`;
  console.log(`Events in Neon: ${evCount[0].n}`);

  const aliasCount = await sql`SELECT COUNT(*) as n FROM product_aliases`;
  console.log(`Aliases in Neon: ${aliasCount[0].n}`);
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
