export interface Env {
  DB: D1Database;
  GITHUB_TOKEN?: string;
  GEMINI_API_KEY?: string;
  CRON_SECRET?: string;
}

export interface ScoreComponents {
  [key: string]: number;
}

export interface Evidence {
  type: string;
  url?: string;
  note?: string;
  date?: string;
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

export function slugify(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function nowISO(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
