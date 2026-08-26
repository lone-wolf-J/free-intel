import schema from "./db/schema.sql";
import { makeEnsureSchema } from "./db/init";
import { buildApp } from "./app";

const ensureSchema = makeEnsureSchema(schema);

export default {
  fetch: buildApp(ensureSchema).fetch,
  async scheduled(_event: unknown, env: any, ctx: any) {
    const { processCrawlBatch } = await import("./lib/discovery");
    ctx.waitUntil(processCrawlBatch(env, { maxFetches: 25 }).catch((e) => console.error("[cron]", e)));
  }
};
