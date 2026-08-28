import dotenv from "dotenv";
dotenv.config();

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// In-memory store
const cases: Map<string, any> = new Map();

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const id = pathParts[1];
  const action = pathParts[2];

  try {
    if (request.method === "GET" && !id) {
      const allCases = Array.from(cases.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return jsonResponse(allCases);
    }

    if (request.method === "GET" && id) {
      const caseData = cases.get(id);
      if (!caseData) return jsonResponse({ error: "Not found" }, 404);
      return jsonResponse(caseData);
    }

    if (request.method === "POST") {
      const body = await request.json();
      const newId = body.id || Date.now().toString();
      const caseData = {
        ...body,
        id: newId,
        stage: body.stage || "new",
        tags: body.tags || [],
        timestamp: body.timestamp || new Date().toISOString(),
      };
      cases.set(newId, caseData);
      return jsonResponse(caseData, 201);
    }

    if (request.method === "PATCH" && id && action === "stage") {
      const { stage } = await request.json();
      const caseData = cases.get(id);
      if (!caseData) return jsonResponse({ error: "Not found" }, 404);
      caseData.stage = stage;
      caseData.updatedAt = new Date().toISOString();
      return jsonResponse(caseData);
    }

    if (request.method === "DELETE" && id) {
      if (!cases.has(id)) return jsonResponse({ error: "Not found" }, 404);
      cases.delete(id);
      return jsonResponse({ deleted: true });
    }

    return jsonResponse({ error: "Not found" }, 404);
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
