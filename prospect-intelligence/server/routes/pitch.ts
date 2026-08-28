import { Hono } from "hono";
import { aiRegistry } from "../lib/ai-registry.js";

const pitches: Map<string, any> = new Map();

export const pitchRoute = new Hono();

pitchRoute.post("/", async (c) => {
  const body = await c.req.json();
  const { caseId, tone, notes, customFields } = body;

  try {
    const prompt = `Generate a personalized sales/outreach pitch.

Tone: ${tone}
Notes from researcher: ${notes || "None"}
Custom context: ${JSON.stringify(customFields || [])}

Generate a compelling email pitch. Return ONLY a JSON object (no markdown, no code blocks):
{
  "subject": "Email subject line",
  "body": "Full email body"
}`;

    const { result, provider } = await aiRegistry.generateJSON<{ subject: string; body: string }>(
      prompt,
      { temperature: 0.7, maxTokens: 2048 }
    );
    console.log(`[PI] Pitch generated using: ${provider}`);
    return c.json(result);
  } catch (e: any) {
    console.error("[PI] Pitch AI error:", e?.message || e);
    // Fallback
    return c.json({
      subject: `Regarding your work — ${tone} outreach`,
      body: `Hi,\n\nI wanted to reach out based on some research we've done.\n\n${notes ? `Notes: ${notes}\n\n` : ""}Would love to connect.\n\nBest regards`,
    });
  }
});

pitchRoute.put("/", async (c) => {
  const body = await c.req.json();
  const id = Date.now().toString();
  const pitch = {
    ...body,
    id,
    createdAt: new Date().toISOString(),
  };
  pitches.set(id, pitch);
  return c.json(pitch, 201);
});

pitchRoute.get("/", (c) => {
  return c.json(Array.from(pitches.values()));
});

export { pitches };