import dotenv from "dotenv";
dotenv.config();

import { serve } from "@hono/node-server";
import app from "./app";

console.log("[PI] GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? `Loaded (${process.env.GEMINI_API_KEY.substring(0, 8)}...)` : "MISSING");
const PORT = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[PI] Server running on http://localhost:${info.port}`);
});
