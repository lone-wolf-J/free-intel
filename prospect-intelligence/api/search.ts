import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";
dotenv.config();

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

  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log("[Vercel-Search] GROQ_API_KEY:", process.env.GROQ_API_KEY ? "SET" : "MISSING");
    console.log("[Vercel-Search] Query:", query);

    const { searchProspectHandler } = await import("./search-handler.js");
    const result = await searchProspectHandler(query);

    return res.status(200).json(result);
  } catch (e: any) {
    console.error("[Vercel-Search] Error:", e);
    return res.status(500).json({ error: e.message || "Internal error" });
  }
}
