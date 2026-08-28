import dotenv from "dotenv";
dotenv.config();

import { Hono } from "hono";
import { cors } from "hono/cors";
import { searchRoute } from "../server/routes/search.js";
import { casesRoute } from "../server/routes/cases.js";
import { pitchRoute } from "../server/routes/pitch.js";
import { statsRoute } from "../server/routes/stats.js";

const app = new Hono();

app.use("/*", cors());

app.route("/api/search", searchRoute);
app.route("/api/cases", casesRoute);
app.route("/api/pitch", pitchRoute);
app.route("/api/stats", statsRoute);

app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

export default app;
