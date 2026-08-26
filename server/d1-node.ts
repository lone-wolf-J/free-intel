/// <reference types="node" />
import { DatabaseSync, StatementSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

type SQLVal = string | number | null;

function normalize(v: unknown): SQLVal {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number" || typeof v === "string") return v;
  return JSON.stringify(v);
}

class D1PreparedStatement {
  constructor(private db: DatabaseSync, private sql: string, private params: SQLVal[] = []) {}

  bind(...values: unknown[]) {
    return new D1PreparedStatement(this.db, this.sql, values.map(normalize));
  }

  private stmt(): StatementSync {
    return this.db.prepare(this.sql);
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const row = this.stmt().get(...this.params) as any;
    if (colName !== undefined) return (row?.[colName] ?? null) as T | null;
    return (row as T) ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const rows = this.stmt().all(...this.params) as T[];
    return { results: rows };
  }

  async run() {
    const info = this.stmt().run(...this.params);
    return {
      success: true,
      meta: {
        last_row_id: Number(info.lastInsertRowid ?? 0),
        changes: Number(info.changes ?? 0)
      }
    };
  }
}

export class D1Sqlite {
  constructor(private db: DatabaseSync) {}

  prepare(sql: string) {
    return new D1PreparedStatement(this.db, sql);
  }

  async exec(sql: string) {
    this.db.exec(sql);
    return { execution_time_ms: 0 };
  }
}

export function openD1FromFile(file: string): D1Sqlite {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  return new D1Sqlite(db);
}
