import dotenv from "dotenv";
dotenv.config();

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const rawBody = await request.text();
    console.log("[Vercel-Search] Raw body:", rawBody);
    console.log("[Vercel-Search] Raw body type:", typeof rawBody);
    console.log("[Vercel-Search] Raw body length:", rawBody?.length);
    console.log("[Vercel-Search] Raw body charCodes:", rawBody?.split('').slice(0, 20).map(c => c.charCodeAt(0)));
    
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error("[Vercel-Search] Parse error, trying workaround...");
      // Try to fix common Vercel body issues
      const fixed = rawBody.replace(/\\"/g, '"');
      body = JSON.parse(fixed);
    }
    const { query } = body;

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Vercel-Search] GROQ_API_KEY:", process.env.GROQ_API_KEY ? "SET" : "MISSING");
    console.log("[Vercel-Search] Query:", query);

    const { searchProspectHandler } = await import("./search-handler.js");
    const result = await searchProspectHandler(query);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[Vercel-Search] Error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
