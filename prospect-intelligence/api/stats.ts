import dotenv from "dotenv";
dotenv.config();

import { aiRegistry } from "../server/lib/ai-registry.js";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  try {
    if (url.pathname.endsWith("/ai-status")) {
      const status = await aiRegistry.getAllStatus();
      return jsonResponse(status);
    }

    return jsonResponse({
      totalSearches: 0,
      totalCases: 0,
      industries: [],
      locations: [],
      pipelineStages: { new: 0, qualified: 0, engaged: 0, closed: 0 },
    });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
