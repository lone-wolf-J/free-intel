/// <reference types="node" />
try { process.loadEnvFile(); } catch { /* no .env file present */ }
import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app";
import { makeEnsureSchema } from "./db/init";
import { openD1FromFile } from "./d1-node";

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(path.join(here, "db", "schema.sql"), "utf8");
const ensureSchema = makeEnsureSchema(schema);

const stateDir = process.env.FI_STATE_DIR || path.join(os.homedir(), ".fi-d1-state");
const dbFile = path.join(stateDir, "freeintel.sqlite");
const db = openD1FromFile(dbFile);

const env = {
  DB: db,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  CRON_SECRET: process.env.CRON_SECRET
};

const app = buildApp(ensureSchema);

const port = Number(process.env.PORT || 8787);
serve({ fetch: (req) => app.fetch(req, env as any), port }, () => {
  console.log(`[free-intel] API on http://127.0.0.1:${port} · sqlite: ${dbFile}`);
  console.log(`[free-intel] github token: ${env.GITHUB_TOKEN ? "SET" : "not set (rate-limited)"} · gemini: ${env.GEMINI_API_KEY ? "SET" : "not set (heuristics only)"}`);
});
