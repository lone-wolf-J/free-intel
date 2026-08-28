import { aiRegistry } from "../server/lib/ai-registry.js";

export async function searchProspectHandler(query: string) {
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

  // Step 4: AI analysis
  let aiAnalysis: any = null;
  let aiError: string | null = null;
  const hasAiKey = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
  console.log("[SearchHandler] hasAiKey:", hasAiKey);

  if (hasAiKey) {
    try {
      aiAnalysis = await analyzeWithAI(query, scrapedData);
      console.log("[SearchHandler] AI result:", JSON.stringify(aiAnalysis).substring(0, 300));
    } catch (e: any) {
      aiError = e?.message || String(e);
      console.error("[SearchHandler] AI error:", aiError);
    }
  }

  // Step 5: Build the case
  return buildCase(query, scrapedData, aiAnalysis, hasAiKey, aiError);
}

async function scrapeGoogle(query: string) {
  const nodeFetch = (await import("node-fetch")).default;
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
  const res = await nodeFetch(url, {
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
  const nodeFetch = (await import("node-fetch")).default;
  const url = `https://www.google.com/search?q=site:linkedin.com+${encodeURIComponent(query)}`;
  const res = await nodeFetch(url, {
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
  const nodeFetch = (await import("node-fetch")).default;
  const url = `https://www.google.com/search?q=${encodeURIComponent(query + " company about")}+site:*&num=5`;
  const res = await nodeFetch(url, {
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

async function analyzeWithAI(query: string, scrapedData: any) {
  const prompt = `Analyze "${query}" for sales intelligence. Return ONLY valid JSON matching this EXACT schema:

{
  "person": {"name": "string", "title": "string", "company": "string", "location": "string", "email": "string|null", "linkedin": "string|null"},
  "company": {"name": "string", "industry": "string", "size": "string", "revenue": "string|null", "founded": "string|null", "headquarters": "string", "website": "string", "description": "string"},
  "sections": [{"title": "string", "items": [{"label": "string", "value": "string"}]}],
  "aiInsights": ["string", "string", "string"],
  "confidenceScore": number
}

Sections must include: Summary, Career, Role, Company, Activity, Leadership, Interests, Tech, Priorities, Signals, Challenges, Stakeholders, Relationships, Opportunities, Openers, Questions, Strategy, Risks, Confidence.`;

  const { result, provider } = await aiRegistry.generateJSON(prompt, { temperature: 0.3, maxTokens: 3000 });
  console.log(`[SearchHandler] AI analysis completed using: ${provider}`);
  return result;
}

function buildCase(query: string, scrapedData: any, aiAnalysis: any, hasAiKey: boolean, aiError: string | null) {
  const id = Date.now().toString();
  const timestamp = new Date().toISOString();

  if (aiAnalysis) {
    return {
      id,
      query,
      timestamp,
      person: aiAnalysis.person || {
        name: query,
        title: "",
        company: "",
        linkedin: "",
        location: "",
      },
      company: aiAnalysis.company || {
        name: "",
        industry: "",
        size: "",
        revenue: "",
        founded: "",
        headquarters: "",
        website: "",
        description: "",
      },
      sections: aiAnalysis.sections || [],
      aiInsights: aiAnalysis.aiInsights || [],
      confidenceScore: aiAnalysis.confidenceScore || 50,
      savedToPipeline: false,
    };
  }

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
