import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";
dotenv.config();

import { aiRegistry } from "../server/lib/ai-registry.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    if (req.url?.endsWith("/ai-status")) {
      const status = await aiRegistry.getAllStatus();
      return res.json(status);
    }

    return res.json({
      totalSearches: 0,
      totalCases: 0,
      industries: [],
      locations: [],
      pipelineStages: { new: 0, qualified: 0, engaged: 0, closed: 0 },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
