import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./lib/util";
import type { EnsureSchema } from "./db/init";
import { resourceApp } from "./routes/resources";
import { radarApp } from "./routes/radar";
import { stackApp } from "./routes/stacks";
import { miscApp } from "./routes/misc";
import { scansApp } from "./routes/scans";
import { productsApp } from "./routes/products";
import { dealsApp } from "./routes/deals";

export function buildApp(ensureSchema: EnsureSchema) {
  const app = new Hono<{ Bindings: Env }>();

  app.use("*", cors());
  app.use("/api/*", async (c, next) => {
    try {
      await ensureSchema(c.env.DB);
    } catch (e) {
      console.error("[free-intel] schema init failed:", e);
      return c.json({ error: "database_init_failed", message: String((e as Error)?.message || e) }, 500);
    }
    await next();
  });

  app.get("/api/health", (c) =>
    c.json({ ok: true, service: "free-intel-api", version: "1.0.0" })
  );

  app.route("/api", resourceApp);
  app.route("/api", radarApp);
  app.route("/api", stackApp);
  app.route("/api", miscApp);
  app.route("/api", scansApp);
  app.route("/api", productsApp);
  app.route("/api", dealsApp);

  app.notFound((c) => c.json({ error: "not_found" }, 404));

  app.onError((err, c) => {
    console.error("[free-intel] unhandled error:", err);
    return c.json({ error: "internal_error", message: String(err?.message || err) }, 500);
  });

  return app;
}
