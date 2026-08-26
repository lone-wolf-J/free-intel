import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

export { sql };

export async function ensureSchema() {
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

  await sql`CREATE TABLE IF NOT EXISTS saved_stacks (
    id SERIAL PRIMARY KEY,
    goal TEXT NOT NULL,
    plan_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}
