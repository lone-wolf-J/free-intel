import dotenv from "dotenv";
dotenv.config();

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const cases: Map<string, any> = new Map();

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const id = pathParts[1];
  const action = pathParts[2];

  if (!id) {
    const allCases = Array.from(cases.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return jsonResponse(allCases);
  }

  if (id && !action) {
    const caseData = cases.get(id);
    if (!caseData) return jsonResponse({ error: "Not found" }, 404);
    return jsonResponse(caseData);
  }

  return jsonResponse({ error: "Not found" }, 404);
}

export async function POST(request: Request): Promise<Response> {
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

export async function PATCH(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const id = pathParts[1];

  const { stage } = await request.json();
  const caseData = cases.get(id);
  if (!caseData) return jsonResponse({ error: "Not found" }, 404);
  caseData.stage = stage;
  caseData.updatedAt = new Date().toISOString();
  return jsonResponse(caseData);
}

export async function DELETE(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const id = pathParts[1];

  if (!cases.has(id)) return jsonResponse({ error: "Not found" }, 404);
  cases.delete(id);
  return jsonResponse({ deleted: true });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
