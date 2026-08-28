import { Hono } from "hono";
import fetch from "node-fetch";
import { aiRegistry } from "../lib/ai-registry.js";

export const searchRoute = new Hono();

searchRoute.post("/", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch (e: any) {
    console.error("[PI-Search] Failed to parse request body:", e.message);
    const rawBody = await c.req.text();
    console.error("[PI-Search] Raw body (first 200 chars):", rawBody?.substring(0, 200));
    return c.json({ error: "Invalid request body", raw: rawBody?.substring(0, 200) }, 400);
  }
  const { query } = body;

  if (!query || typeof query !== "string") {
    return c.json({ error: "Query is required" }, 400);
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  console.log("[PI-Search] Key:", geminiKey ? geminiKey.substring(0, 10) + "..." : "MISSING");
  let scrapedData: any = {};

  // Step 1: Web scraping (Google search results)
  try {
    const googleResults = await scrapeGoogle(query);
    scrapedData.google = googleResults;
  } catch {
    scrapedData.google = [];
  }

  // Step 2: Try to find LinkedIn profile
  try {
    const linkedinData = await scrapeLinkedInPublic(query);
    scrapedData.linkedin = linkedinData;
  } catch {
    scrapedData.linkedin = null;
  }

  // Step 3: Try company website
  try {
    const companyData = await scrapeCompanyInfo(query);
    scrapedData.company = companyData;
  } catch {
    scrapedData.company = null;
  }

  // Step 4: AI analysis (if any key available)
  let aiAnalysis: any = null;
  let aiError: string | null = null;
  const hasAiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  console.log("[PI-Search] GROQ_API_KEY:", process.env.GROQ_API_KEY ? "SET" : "MISSING");
  console.log("[PI-Search] GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "SET" : "MISSING");
  console.log("[PI-Search] hasAiKey:", !!hasAiKey);
  if (hasAiKey) {
    try {
      aiAnalysis = await analyzeWithGemini(query, scrapedData);
      console.log("[PI] AI result:", JSON.stringify(aiAnalysis).substring(0, 300));
    } catch (e: any) {
      aiError = e?.message || String(e);
      console.error("[PI] AI error:", aiError);
      console.error("[PI] AI error stack:", e?.stack);
    }
  }

  // Step 5: Build the case
  const caseData = buildCase(query, scrapedData, aiAnalysis, aiError);

  return c.json(caseData);
});

async function scrapeGoogle(query: string) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();

  const results: { title: string; snippet: string; url: string }[] = [];
  const regex = /<h3[^>]*>(.*?)<\/h3>.*?<div[^>]*class="[^"]*"[^>]*>(.*?)<\/div>/gs;
  let match;
  while ((match = regex.exec(html)) && results.length < 10) {
    results.push({
      title: match[1].replace(/<[^>]+>/g, ""),
      snippet: match[2].replace(/<[^>]+>/g, ""),
      url: "",
    });
  }

  return results;
}

async function scrapeLinkedInPublic(query: string) {
  const url = `https://www.google.com/search?q=site:linkedin.com+${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();

  const linkedinMatch = html.match(/linkedin\.com\/in\/([^"&?]+)/);
  return linkedinMatch
    ? { url: `https://linkedin.com/in/${linkedinMatch[1]}` }
    : null;
}

async function scrapeCompanyInfo(query: string) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query + " company about")}+site:*&num=5`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  const snippets: string[] = [];
  const regex = /<div[^>]*>(.*?)<\/div>/g;
  let match;
  while ((match = regex.exec(html)) && snippets.length < 5) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 50) snippets.push(text);
  }
  return { snippets };
}

async function analyzeWithGemini(
  query: string,
  scrapedData: any
) {
  const webResults = (scrapedData.web || scrapedData.google || []).slice(0, 8).map((r: any, i: number) => `${i + 1}. Title: ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`).join("\n\n");
  const enriched = scrapedData.enriched ? `\n\nEnriched page content (top result):\n${scrapedData.enriched.slice(0, 2000)}` : "";
  const prompt = `You are a prospect intelligence analyst. Analyze "${query}" for sales intelligence.

FRESH WEB SEARCH RESULTS (use as PRIMARY source - this is real-time data crawled just now):
${webResults || "No web results returned"}
${enriched}

CRITICAL RULES:
- GROUND your answer in the web results above. If web results contain relevant info about "${query}", EXTRACT it and build the dossier from those snippets/URLs. Do NOT say "no data" when results exist.
- confidenceScore: 85-95 if strong public figure with multiple results, 60-84 if moderate results, 30-50 if weak, 5-15 only if ZERO relevant results.

Return ONLY valid JSON matching this EXACT schema:
{
  "person": {"name": "string", "title": "string", "company": "string", "location": "string", "email": "string|null", "linkedin": "string|null"},
  "company": {"name": "string", "industry": "string", "size": "string", "revenue": "string|null", "founded": "string|null", "headquarters": "string", "website": "string", "description": "string"},
  "sections": [{"title": "string", "items": [{"label": "string", "value": "string"}]}],
  "aiInsights": ["string", "string", "string"],
  "confidenceScore": number
}

Sections must include: Summary, Career, Role, Company, Activity, Leadership, Interests, Tech, Priorities, Signals, Challenges, Stakeholders, Relationships, Opportunities, Openers, Questions, Strategy, Risks, Confidence.`;

  const { result, provider } = await aiRegistry.generateJSON(prompt, { temperature: 0.3, maxTokens: 3000 });
  console.log(`[PI] AI analysis completed using: ${provider}`);
  return result;
}

function buildCase(query: string, scrapedData: any, aiAnalysis: any, aiError?: string | null) {
  const id = Date.now().toString();
  const timestamp = new Date().toISOString();
  const hasAiKey = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);

  if (aiAnalysis) {
    const isLowConfidence = typeof aiAnalysis.confidenceScore === "number" && aiAnalysis.confidenceScore < 20;
    const hasUnknownMarker = JSON.stringify(aiAnalysis).toLowerCase().includes("no public data") || JSON.stringify(aiAnalysis).toLowerCase().includes("unknown");
    if (isLowConfidence && !hasUnknownMarker) {
      aiAnalysis.person = { name: query, title: "Unknown - no public data found", company: "Unknown", location: "Unknown", email: null, linkedin: null };
      aiAnalysis.company = { name: "Unknown", industry: "Unknown", size: "Unknown", revenue: null, founded: null, headquarters: "Unknown", website: "", description: "No verifiable public information found." };
      aiAnalysis.confidenceScore = 8;
      aiAnalysis.aiInsights = [
        `No verifiable public information found for "${query}". Entity appears to be private or not a widely-known public figure.`,
        "Do not use fabricated title/company for outreach. Manual verification via LinkedIn/company site required.",
        "Try searching with full name + company + LinkedIn URL for better grounding."
      ];
      aiAnalysis.sections = [
        { title: "Summary", items: [{ label: "Status", value: `No verifiable public information found for "${query}". This appears to be a private individual or non-public entity. Do not use for outreach without manual verification.` }] },
        ...(aiAnalysis.sections || []).slice(1)
      ];
    }
    return {
      id,
      query,
      timestamp,
      person: aiAnalysis.person || {
        name: query,
        title: "Unknown - no public data found",
        company: "Unknown",
        linkedin: "",
        location: "Unknown",
      },
      company: aiAnalysis.company || {
        name: "Unknown",
        industry: "Unknown",
        size: "Unknown",
        revenue: null,
        founded: null,
        headquarters: "Unknown",
        website: "",
        description: "No verifiable public information found.",
      },
      sections: aiAnalysis.sections || [],
      aiInsights: aiAnalysis.aiInsights || [],
      confidenceScore: aiAnalysis.confidenceScore ?? 8,
      savedToPipeline: false,
    };
  }

  // Fallback without AI
  return {
    id,
    query,
    timestamp,
    person: {
      name: query
        .split(" ")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      title: "",
      company: "",
      linkedin: scrapedData.linkedin?.url || "",
      location: "",
    },
    company: {
      name: "",
      industry: "",
      size: "",
      revenue: "",
      founded: "",
      headquarters: "",
      website: "",
      description: "",
    },
    sections: [
      {
        title: "Google Results",
        icon: "Globe",
        items: (scrapedData.google || []).slice(0, 5).map((r: any) => ({
          label: r.title?.slice(0, 40) || "Result",
          value: r.snippet?.slice(0, 100) || "",
        })),
      },
    ],
    aiInsights: [
      hasAiKey ? `AI key is set (${process.env.GROQ_API_KEY ? "GROQ" : "GEMINI"}) but analysis failed` : "No AI API keys configured",
      aiError ? `Error: ${aiError}` : "Check Vercel function logs for details",
    ],
    confidenceScore: scrapedData.google?.length ? 30 : 10,
    savedToPipeline: false,
  };
}
