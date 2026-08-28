import dotenv from "dotenv";
dotenv.config();

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
