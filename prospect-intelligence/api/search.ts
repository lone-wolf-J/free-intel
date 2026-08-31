import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";
dotenv.config();
import { validateQuery, checkRateLimit } from "./_security.js";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkRateLimit(req, "search")) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute." });
  }

  // Validate content-type
  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json")) {
    return res.status(400).json({ error: "Content-Type must be application/json" });
  }

  try {
    const rawQuery = req.body?.query;
    const query = validateQuery(rawQuery);

    console.log("[Vercel-Search] GROQ_API_KEY:", process.env.GROQ_API_KEY ? "SET" : "MISSING");
    console.log("[Vercel-Search] Query:", query.slice(0, 80));

    const { searchProspectHandler } = await import("./search-handler.js");
    const result = await searchProspectHandler(query);

    return res.status(200).json(result);
  } catch (e: any) {
    console.error("[Vercel-Search] Error:", e);
    // Don't leak stack traces or internal details to client
    const msg = e.message?.includes("Query") || e.message?.includes("Too many") ? e.message : "Search failed. Please try a different query.";
    const status = e.message?.includes("Too many") ? 429 : e.message?.includes("Query") ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
}
