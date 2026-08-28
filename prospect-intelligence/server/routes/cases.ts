import { Hono } from "hono";

// In-memory store (replace with Neon DB in production)
const cases: Map<string, any> = new Map();

export const casesRoute = new Hono();

casesRoute.get("/", (c) => {
  const allCases = Array.from(cases.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return c.json(allCases);
});

casesRoute.get("/:id", (c) => {
  const id = c.req.param("id");
  const caseData = cases.get(id);
  if (!caseData) return c.json({ error: "Not found" }, 404);
  return c.json(caseData);
});

casesRoute.post("/", async (c) => {
  const body = await c.req.json();
  const id = body.id || Date.now().toString();
  const caseData = {
    ...body,
    id,
    stage: body.stage || "new",
    tags: body.tags || [],
    timestamp: body.timestamp || new Date().toISOString(),
  };
  cases.set(id, caseData);
  return c.json(caseData, 201);
});

casesRoute.patch("/:id/stage", async (c) => {
  const id = c.req.param("id");
  const { stage } = await c.req.json();
  const caseData = cases.get(id);
  if (!caseData) return c.json({ error: "Not found" }, 404);
  caseData.stage = stage;
  caseData.updatedAt = new Date().toISOString();
  return c.json(caseData);
});

casesRoute.delete("/:id", (c) => {
  const id = c.req.param("id");
  if (!cases.has(id)) return c.json({ error: "Not found" }, 404);
  cases.delete(id);
  return c.json({ deleted: true });
});
