import { Hono } from "hono";
import { cors } from "hono/cors";
import { searchRoute } from "./routes/search";
import { casesRoute } from "./routes/cases";
import { pitchRoute } from "./routes/pitch";
import { statsRoute } from "./routes/stats";

const app = new Hono();

app.use("/*", cors());

app.route("/api/search", searchRoute);
app.route("/api/cases", casesRoute);
app.route("/api/pitch", pitchRoute);
app.route("/api/stats", statsRoute);

app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

export default app;
