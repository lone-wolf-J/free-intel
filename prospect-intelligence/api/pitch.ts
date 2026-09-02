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
    // Prospect context sent from frontend for LevelShift-specific personalization
    const prospect = req.body?.prospect || null;
    const prospectSummary = prospect
      ? `Prospect: ${prospect.person?.name || ""} — ${prospect.person?.title || ""} at ${prospect.person?.company || prospect.company?.name || ""} (${prospect.person?.location || ""})
Company: ${prospect.company?.name || ""} | Industry: ${prospect.company?.industry || ""} | Size: ${prospect.company?.size || ""} | Desc: ${prospect.company?.description?.slice(0, 300) || ""}
Key sections: ${(prospect.sections || []).slice(0, 3).map((s: any) => `${s.title}: ${s.items?.[0]?.value?.slice(0, 120) || ""}`).join(" | ")}
Confidence: ${prospect.confidenceScore || ""}%`
      : `Prospect ID: ${req.body?.caseId || "unknown"} (no details)`;

    const levelshiftContext = `LevelShift is a global AI transformation partner (25 years, unified from PreludeSys 1998 + DemandBlue 2012 + DemandDynamics 2020). Mission: make enterprises AI-native, embedding AI across core functions for measurable outcomes. Four pillars: (1) Data Modernization - Microsoft Fabric, Azure, Power BI, Databricks - cloud, data engineering, analytics, AI/ML, governance; (2) Salesforce Services - optimize/customize Salesforce with AI, predictive; (3) Dynamics Services - enhance Dynamics 365 with AI; (4) Enterprise Integration - Boomi, MuleSoft, Azure with AI automation. Partners: Microsoft Solutions Partner (Azure, Business Applications, Data & AI), Fabric Featured Partner, Strategic Boomi, Salesforce Summit. 300+ orgs, Great Place to Work 2021-2026, CLAPQ values. Approach: human-AI synergy, speed/expertise/outcomes.`;

    const customFieldsText = (req.body?.customFields || []).filter((f: any) => f.key && f.value).map((f: any) => `${f.key}: ${f.value}`).join("\n") || "None";

    const prompt = `You are a LevelShift business development writer. Generate a HIGHLY SPECIFIC, personalized outreach email that clearly highlights the MATCH between LevelShift and the prospect.

LevelShift Context (use to tailor):
${levelshiftContext}

Prospect Intelligence:
${prospectSummary}
Researcher notes: ${notes || "None"}
Custom fields: ${customFieldsText}

Tone: ${tone}

MANDATORY:
- Open with a specific observation about the prospect's role/company (from intelligence), not a generic compliment.
- In 1-2 sentences, connect their likely priority/challenge to a SPECIFIC LevelShift pillar (e.g., if prospect uses Salesforce/Dynamics/data sprawl/integration pain, name Fabric/Power BI/Boomi/MuleSoft/Azure).
- Mention our relevant credential only if relevant (e.g., Salesforce Summit Partner for Salesforce teams).
- Include a low-friction CTA (15-min AI readiness call / readiness assessment).
- Keep under 130 words, plain text, no placeholders like [DATE].
- Subject must be specific and curiosity-driven, include prospect company or role.

Return ONLY JSON (no markdown):
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
