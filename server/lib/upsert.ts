import { nowISO } from "./util";
import type { DbLike } from "../db/init";

export function slugify(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function j<T = any>(s: unknown, fb: T): T {
  if (s == null) return fb;
  try {
    const v = JSON.parse(String(s));
    return (v ?? fb) as T;
  } catch {
    return fb;
  }
}

export function hydrate(r: any) {
  if (!r) return r;
  return {
    ...r,
    tags: j<string[]>(r.tags, []),
    capabilities: j<string[]>(r.capabilities, []),
    free_types: j<string[]>(r.free_types, []),
    source_urls: j<string[]>(r.source_urls, [])
  };
}

export interface ResourceInput {
  slug: string;
  name: string;
  description?: string;
  provider?: string | null;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[];
  capabilities?: string[];
  url?: string | null;
  docs_url?: string | null;
  pricing_url?: string | null;
  github_url?: string | null;
  resource_type?: string;
  free_types?: string[];
  personal_use?: string;
  commercial_use?: string;
  license?: string | null;
  card_required?: string;
  self_hostable?: string;
  infrastructure_note?: string | null;
  alt_of?: string | null;
  alt_kind?: string | null;
  free_score?: number;
  free_score_components?: Record<string, number>;
  confidence_score?: number;
  popularity?: number | null;
  forks?: number | null;
  github_last_push?: string | null;
  difficulty?: string;
  origin?: string;
}

export async function upsertResource(db: DbLike, r: ResourceInput): Promise<{ id: number; created: boolean }> {
  const existing = await db
    .prepare("SELECT id FROM resources WHERE slug = ?")
    .bind(r.slug)
    .first();
  if (existing) {
    await db
      .prepare(
        `UPDATE resources SET
          name=COALESCE(?, name), description=CASE WHEN LENGTH(COALESCE(?,'')) > LENGTH(COALESCE(description,'')) THEN ? ELSE description END,
          popularity=COALESCE(?, popularity), forks=COALESCE(?, forks), github_last_push=COALESCE(?, github_last_push),
          license=COALESCE(?, license), pricing_url=COALESCE(?, pricing_url),
          updated_at=datetime('now')
         WHERE id=?`
      )
      .bind(
        r.name ?? null,
        r.description ?? null,
        r.description ?? null,
        r.popularity ?? null,
        r.forks ?? null,
        r.github_last_push ?? null,
        r.license ?? null,
        r.pricing_url ?? null,
        existing.id
      )
      .run();
    return { id: Number(existing.id), created: false };
  }

  const res = await db
    .prepare(
      `INSERT INTO resources
       (slug,name,description,provider,category,subcategory,tags,capabilities,url,docs_url,pricing_url,github_url,
        resource_type,free_types,personal_use,commercial_use,license,card_required,self_hostable,infrastructure_note,
        alt_of,alt_kind,first_discovered,free_score,free_score_components,confidence_score,popularity,forks,
        github_last_push,difficulty,origin)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?,?,?,?,?,?,?,?)`
    )
    .bind(
      r.slug,
      r.name,
      r.description || "",
      r.provider ?? null,
      r.category ?? null,
      r.subcategory ?? null,
      JSON.stringify(r.tags || []),
      JSON.stringify(r.capabilities || []),
      r.url ?? null,
      r.docs_url ?? null,
      r.pricing_url ?? null,
      r.github_url ?? null,
      r.resource_type || "unknown",
      JSON.stringify(r.free_types || []),
      r.personal_use || "unknown",
      r.commercial_use || "unknown",
      r.license ?? null,
      r.card_required || "unknown",
      r.self_hostable || "unknown",
      r.infrastructure_note ?? null,
      r.alt_of ?? null,
      r.alt_kind ?? null,
      r.free_score ?? 0,
      JSON.stringify(r.free_score_components || {}),
      r.confidence_score ?? 30,
      r.popularity ?? null,
      r.forks ?? null,
      r.github_last_push ?? null,
      r.difficulty || "unknown",
      r.origin || "crawler"
    )
    .run();
  const id = Number(res.meta.last_row_id);
  await registerAlias(db, r.name, id).catch(() => {});
  return { id, created: true };
}

export async function addEvidence(
  db: DbLike,
  resourceId: number,
  claim: string,
  sourceUrl: string | null,
  evidenceText: string | null,
  method: string,
  confidence: number
) {
  await db
    .prepare(
      `INSERT INTO evidence (resource_id,claim,source_url,evidence_text,retrieved_at,method,confidence)
       VALUES (?,?,?,?,datetime('now'),?,?)`
    )
    .bind(resourceId, claim.slice(0, 300), sourceUrl, evidenceText?.slice(0, 800) ?? null, method, confidence)
    .run();
}

export async function registerAlias(db: DbLike, alias: string, resourceId: number) {
  const key = String(alias).trim().toLowerCase().slice(0, 80);
  if (!key) return;
  await db.prepare("INSERT OR IGNORE INTO product_aliases (alias_lower, resource_id) VALUES (?,?)").bind(key, resourceId).run();
}

export async function logEvent(
  db: DbLike,
  type: string,
  title: string,
  detail: string | null,
  resourceId: number | null,
  severity = "info"
) {
  await db
    .prepare("INSERT INTO events (type,title,detail,resource_id,severity) VALUES (?,?,?,?,?)")
    .bind(type, title, detail?.slice(0, 500) ?? null, resourceId, severity)
    .run();
}

export function ghRepoPath(url: string): string | null {
  const m = String(url).match(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/);
  return m ? m[1].replace(/\.git$/, "").replace(/\/$/, "") : null;
}

export { nowISO };
