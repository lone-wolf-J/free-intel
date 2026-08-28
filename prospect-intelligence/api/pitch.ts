import dotenv from "dotenv";
dotenv.config();

import { aiRegistry } from "../server/lib/ai-registry.js";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (request.method === "POST") {
      const body = await request.json();
      const { tone, notes } = body;

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
      return jsonResponse(result);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    console.error("[Pitch] Error:", e);
    return jsonResponse({
      subject: `Outreach pitch`,
      body: `Hi,\n\nI wanted to reach out based on some research we've done.\n\nWould love to connect.\n\nBest regards`,
    });
  }
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
