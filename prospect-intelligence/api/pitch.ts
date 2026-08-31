import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";
dotenv.config();

import { aiRegistry } from "../server/lib/ai-registry.js";
import { validateTone, checkRateLimit } from "./_security.js";

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
  if (!checkRateLimit(req, "pitch")) return res.status(429).json({ error: "Too many requests" });
  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json")) return res.status(400).json({ error: "Content-Type must be application/json" });

  try {
    const tone = validateTone(req.body?.tone || "professional");
    const notes = typeof req.body?.notes === "string" ? req.body.notes.slice(0, 1000) : "";
    if (req.body?.customFields && !Array.isArray(req.body.customFields)) {
      return res.status(400).json({ error: "Invalid customFields" });
    }

    const prompt = `Generate a personalized sales/outreach pitch.

Tone: ${tone || "professional"}
Notes from researcher: ${notes || "None"}

Generate a compelling email pitch. Return ONLY a JSON object (no markdown, no code blocks):
{
  "subject": "Email subject line",
  "body": "Full email body"
}`;

    const { result, provider } = await aiRegistry.generateJSON<{ subject: string; body: string }>(
      prompt,
      { temperature: 0.7, maxTokens: 2048 }
    );
    console.log(`[Pitch] Generated using: ${provider}`);
    return res.json(result);
  } catch (e: any) {
    console.error("[Pitch] Error:", e);
    return res.json({
      subject: `Outreach pitch`,
      body: `Hi,\n\nI wanted to reach out based on some research we've done.\n\nWould love to connect.\n\nBest regards`,
    });
  }
}
