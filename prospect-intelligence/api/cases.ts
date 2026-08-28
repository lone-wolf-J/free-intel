import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";
dotenv.config();

const cases: Map<string, any> = new Map();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const url = req.url || "";
  const pathParts = url.split("/").filter(Boolean);
  const id = pathParts[1];
  const action = pathParts[2];

  try {
    if (req.method === "GET" && !id) {
      const allCases = Array.from(cases.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return res.json(allCases);
    }

    if (req.method === "GET" && id && !action) {
      const caseData = cases.get(id);
      if (!caseData) return res.status(404).json({ error: "Not found" });
      return res.json(caseData);
    }

    if (req.method === "POST") {
      const body = req.body;
      const newId = body.id || Date.now().toString();
      const caseData = {
        ...body,
        id: newId,
        stage: body.stage || "new",
        tags: body.tags || [],
        timestamp: body.timestamp || new Date().toISOString(),
      };
      cases.set(newId, caseData);
      return res.status(201).json(caseData);
    }

    if (req.method === "PATCH" && id && action === "stage") {
      const { stage } = req.body;
      const caseData = cases.get(id);
      if (!caseData) return res.status(404).json({ error: "Not found" });
      caseData.stage = stage;
      caseData.updatedAt = new Date().toISOString();
      return res.json(caseData);
    }

    if (req.method === "DELETE" && id) {
      if (!cases.has(id)) return res.status(404).json({ error: "Not found" });
      cases.delete(id);
      return res.json({ deleted: true });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
