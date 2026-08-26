export interface DbLike {
  prepare: (sql: string) => any;
}

function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      if (inQuote && sql[i + 1] === "'") {
        cur += "''";
        i++;
        continue;
      }
      inQuote = !inQuote;
      cur += ch;
      continue;
    }
    if (!inQuote) {
      if (ch === "-" && sql[i + 1] === "-") {
        while (i < sql.length && sql[i] !== "\n") i++;
        cur += "\n";
        continue;
      }
      if (ch === ";") {
        if (cur.trim()) out.push(cur.trim());
        cur = "";
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function execAll(db: DbLike, sql: string) {
  for (const stmt of splitStatements(sql)) {
    try {
      await db.prepare(stmt).run();
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      if (/already exists|duplicate/i.test(msg)) continue;
      throw new Error(`SCHEMA INIT FAILED on [${stmt.slice(0, 80)}…]: ${msg}`);
    }
  }
}

export type EnsureSchema = (db: DbLike) => Promise<void>;

export function makeEnsureSchema(schemaText: string): EnsureSchema {
  const cache = new WeakMap<object, Promise<void>>();
  return (db: DbLike) => {
    const key = db as unknown as object;
    let p = cache.get(key);
    if (!p) {
      p = (async () => {
        const row = await db
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='resources'")
          .first();
        if (row) return;
        await execAll(db, schemaText);
      })().catch((e) => {
        cache.delete(key);
        throw e;
      });
      cache.set(key, p);
    }
    return p;
  };
}
