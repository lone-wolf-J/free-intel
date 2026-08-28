import { Hono } from "hono";
import { aiRegistry } from "../lib/ai-registry.js";

export const statsRoute = new Hono();

statsRoute.get("/", (c) => {
  return c.json({
    totalSearches: 0,
    totalCases: 0,
    industries: [],
    locations: [],
    pipelineStages: { new: 0, qualified: 0, engaged: 0, closed: 0 },
  });
});

statsRoute.get("/ai-status", async (c) => {
  const status = await aiRegistry.getAllStatus();
  return c.json(status);
});
