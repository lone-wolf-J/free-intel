import { aiRegistry } from "../server/lib/ai-registry.js";

export async function searchProspectHandler(query: string) {
  console.log("[SearchHandler] Starting crawl for:", query);
  const crawlResults = await crawlEverywhere(query);
  console.log("[SearchHandler] Crawl done. web:", (crawlResults.web as any[])?.length, "deep:", crawlResults.deepPages?.length, "enrich:", !!crawlResults.enrichment);

  let aiAnalysis: any = null;
  let aiError: string | null = null;
  const hasAiKey = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.TINYFISH_API_KEY);
  if (hasAiKey) {
    try {
      aiAnalysis = await analyzeWithAI(query, crawlResults);
      console.log("[SearchHandler] AI result:", JSON.stringify(aiAnalysis).substring(0, 400));
    } catch (e: any) {
      aiError = e?.message || String(e);
      console.error("[SearchHandler] AI error:", aiError);
    }
  }
  return buildCase(query, crawlResults, aiAnalysis, hasAiKey, aiError);
}

async function crawlEverywhere(query: string) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const fetchWithTimeout = async (url: string, opts: any = {}, ms = 12000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch(url, { ...opts, signal: ctrl.signal });
      return res;
    } finally { clearTimeout(t); }
  };

  // ---------- Tier 1: SEARCH (balanced consumption) ----------
  async function fetchSerper(q: string) {
    const key = process.env.SERPER_API_KEY;
    if (!key) return [];
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch("https://google.serper.dev/search", { method: "POST", headers: { "X-API-KEY": key, "Content-Type": "application/json" }, body: JSON.stringify({ q, num: 10 }) });
      const data: any = await res.json();
      const results = (data.organic || []).slice(0, 10).map((r: any) => ({ title: r.title, snippet: r.snippet || "", url: r.link, source: "serper" }));
      console.log("[Crawl] Serper", results.length);
      return results;
    } catch (e: any) { console.log("[Crawl] Serper fail", e.message); return []; }
  }
  async function fetchTavily(q: string) {
    const key = process.env.TAVILY_API_KEY;
    if (!key) return [];
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: key, query: q, max_results: 8, search_depth: "basic", include_answer: false }) });
      const data: any = await res.json();
      const results = (data.results || []).slice(0, 8).map((r: any) => ({ title: r.title, snippet: r.content?.slice(0, 300) || "", url: r.url, source: "tavily" }));
      console.log("[Crawl] Tavily", results.length);
      return results;
    } catch (e: any) { console.log("[Crawl] Tavily fail", e.message); return []; }
  }
  // Tier 1 free fallbacks (zero cost)
  async function fetchDuckDuckGo(q: string) {
    try {
      const res = await fetchWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { headers: { "User-Agent": UA } });
      const html = await res.text();
      const results: any[] = [];
      const altRegex = /<a rel="nofollow" class="result__url" href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
      let m; while ((m = altRegex.exec(html)) && results.length < 8) {
        let url = m[1]; const uddg = url.match(/uddg=([^&]+)/); if (uddg) try { url = decodeURIComponent(uddg[1]); } catch {}
        if (url.includes("duckduckgo.com")) continue;
        results.push({ title: m[2].trim(), snippet: "", url, source: "duckduckgo" });
      }
      console.log("[Crawl] DDG", results.length); return results;
    } catch (e: any) { console.log("[Crawl] DDG fail", e.message); return []; }
  }
  async function fetchViaAllOrigins(q: string) {
    try {
      const target = encodeURIComponent(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`);
      const res = await fetchWithTimeout(`https://api.allorigins.win/get?url=${target}`, { headers: { "User-Agent": UA } }, 15000);
      const data: any = await res.json(); const html = data.contents || "";
      const results: any[] = []; const regex = /<a rel="nofollow"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
      let m; while ((m = regex.exec(html)) && results.length < 8) {
        let url = m[1]; const uddg = url.match(/uddg=([^&]+)/); if (uddg) try { url = decodeURIComponent(uddg[1]); } catch {}
        if (url.includes("duckduckgo.com")) continue;
        results.push({ title: m[2].trim(), snippet: "", url, source: "allorigins" });
      }
      console.log("[Crawl] AllOrigins", results.length); return results;
    } catch (e: any) { console.log("[Crawl] AllOrigins fail", e.message); return []; }
  }

  // Intelligent consumption: Serper primary (2500), Tavily only if Serper <3
  const serperResults = await fetchSerper(query);
  let tavilyResults: any[] = [];
  if (serperResults.length < 3) {
    console.log("[Crawl] Serper low, trying Tavily...");
    tavilyResults = await fetchTavily(query);
  } else console.log("[Crawl] Serper sufficient, skipping Tavily to save quota");

  const [ddg, allorig] = await Promise.all([fetchDuckDuckGo(query), fetchViaAllOrigins(query)]);
  const mergedSearch = [...serperResults, ...tavilyResults, ...ddg, ...allorig];
  const seen = new Set(); const web = mergedSearch.filter((r: any) => { if (!r.url || seen.has(r.url)) return false; seen.add(r.url); return true; }).slice(0, 10);
  console.log("[Crawl] Tier1 web total", web.length);

  // ---------- Tier 2: DEEP SCRAPE (balanced across Firecrawl / Scrape.do / Jina) ----------
  // Pick top 2 URLs for deep scrape, rotate provider by query hash to balance free limits
  const hash = query.split("").reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
  const deepPages: any[] = [];
  const topUrls = web.slice(0, 2).map((w: any) => w.url).filter(Boolean);

  async function deepScrapeScrapeDo(url: string) {
    const key = process.env.SCRAPE_DO_KEY;
    if (!key) return null;
    try {
      const target = `https://api.scrape.do?token=${key}&url=${encodeURIComponent(url)}&render=true`;
      const res = await fetchWithTimeout(target, {}, 10000);
      const text = await res.text();
      console.log("[Deep] Scrape.do", url.slice(0, 40), "len", text.length);
      return text.slice(0, 3000);
    } catch (e: any) { console.log("[Deep] Scrape.do fail", e.message); return null; }
  }
  async function deepScrapeFirecrawl(url: string) {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) return null;
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 2000 })
      });
      const data: any = await res.json();
      const md = data.data?.markdown || data.markdown || "";
      console.log("[Deep] Firecrawl", url.slice(0, 40), "len", md.length);
      return md.slice(0, 3000);
    } catch (e: any) { console.log("[Deep] Firecrawl fail", e.message); return null; }
  }
  async function deepScrapeJina(url: string) {
    try {
      const jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
      const res = await fetchWithTimeout(jinaUrl, { headers: { "User-Agent": UA } }, 8000);
      const text = await res.text();
      console.log("[Deep] Jina", url.slice(0, 40), "len", text.length);
      return text.slice(0, 3000);
    } catch (e: any) { console.log("[Deep] Jina fail", e.message); return null; }
  }

  for (let i = 0; i < topUrls.length; i++) {
    const url = topUrls[i];
    let content: string | null = null;
    // Rotate provider: hash+i % 3 -> 0:Firecrawl, 1:Scrape.do, 2:Jina - balances free tier
    const choice = (hash + i) % 3;
    if (choice === 0) content = await deepScrapeFirecrawl(url) || await deepScrapeScrapeDo(url) || await deepScrapeJina(url);
    else if (choice === 1) content = await deepScrapeScrapeDo(url) || await deepScrapeFirecrawl(url) || await deepScrapeJina(url);
    else content = await deepScrapeJina(url) || await deepScrapeScrapeDo(url) || await deepScrapeFirecrawl(url);
    if (content) deepPages.push({ url, content: content.slice(0, 2000) });
  }

  // ---------- Tier 3: ENRICHMENT (Explorium + Tinyfish + Public APIs) ----------
  let exploriumData: any = null;
  async function fetchExplorium(q: string) {
    const key = process.env.EXPLORIUM_API_KEY;
    if (!key) return null;
    try {
      const nodeFetch = (await import("node-fetch")).default;
      // Try business enrichment - Explorium v2
      const res: any = await nodeFetch(`https://api.explorium.ai/v1/prospects?query=${encodeURIComponent(q)}`, {
        headers: { "api_key": key, "Content-Type": "application/json" }
      });
      const data: any = await res.json();
      console.log("[Enrich] Explorium", JSON.stringify(data).slice(0, 300));
      return data;
    } catch (e: any) { console.log("[Enrich] Explorium fail", e.message); return null; }
  }
  async function fetchTinyfishEnrich(q: string, webSnippets: string) {
    const key = process.env.TINYFISH_API_KEY;
    if (!key) return null;
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch("https://api.tinyfish.ai/v1/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "tinyfish", messages: [{ role: "user", content: `Enrich prospect "${q}" given these web snippets:\n${webSnippets.slice(0, 1500)}\n\nReturn 2-3 concise enrichment insights about their role/company/industry.` }], max_tokens: 400 })
      });
      const data: any = await res.json();
      const text = data.choices?.[0]?.message?.content || data.output || "";
      console.log("[Enrich] Tinyfish", text.slice(0, 200));
      return text.slice(0, 800);
    } catch (e: any) { console.log("[Enrich] Tinyfish fail", e.message); return null; }
  }
  async function fetchPublicApis() {
    try {
      const res = await fetchWithTimeout("https://api.publicapis.org/entries?category=business&https=true", {}, 5000);
      const data: any = await res.json();
      const entries = (data.entries || []).slice(0, 3).map((e: any) => `${e.API}: ${e.Description} (${e.Link})`).join("; ");
      console.log("[Enrich] PublicAPIs", entries.slice(0, 200));
      return entries;
    } catch (e: any) { console.log("[Enrich] PublicAPIs fail", e.message); return null; }
  }

  const webSnippets = web.map((w: any) => w.snippet).join(" ").slice(0, 1500);
  const [explorium, tinyfish, publicApis] = await Promise.all([
    fetchExplorium(query),
    fetchTinyfishEnrich(query, webSnippets),
    fetchPublicApis()
  ]);

  const linkedinHit = web.find((r: any) => r.url.includes("linkedin.com/in/")) || null;
  const linkedin = linkedinHit ? { url: linkedinHit.url } : null;

  return {
    web,
    google: web,
    linkedin,
    company: { snippets: web.slice(0, 5).map((w: any) => w.snippet).filter(Boolean) },
    deepPages,
    enrichment: { explorium, tinyfish, publicApis },
    rawCount: web.length,
  };
}

async function analyzeWithAI(query: string, scrapedData: any) {
  const webResults = (scrapedData.web || []).slice(0, 8).map((r: any, i: number) => `${i + 1}. Title: ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`).join("\n\n");
  const deepContent = (scrapedData.deepPages || []).map((d: any, i: number) => `Deep Page ${i + 1} (${d.url}):\n${d.content?.slice(0, 1500)}`).join("\n\n");
  const enrich = scrapedData.enrichment ? `\n\nEnrichment:\n- Explorium: ${JSON.stringify(scrapedData.enrichment.explorium)?.slice(0, 600) || "none"}\n- Tinyfish: ${scrapedData.enrichment.tinyfish?.slice(0, 600) || "none"}\n- PublicAPIs sample: ${scrapedData.enrichment.publicApis?.slice(0, 400) || "none"}` : "";

  const prompt = `You are a prospect intelligence analyst. Analyze "${query}" for sales intelligence.

FRESH WEB SEARCH (PRIMARY - ${scrapedData.web?.length || 0} results):
${webResults || "No web results"}

DEEP PAGE CONTENT (from Firecrawl/Scrape.do/Jina - use this for depth):
${deepContent || "No deep pages"}
${enrich}

CRITICAL RULES:
- GROUND in web + deep content above. If results exist, EXTRACT exact titles/companies/locations. Do NOT say "no data" when results exist.
- confidenceScore: 85-95 strong public figure, 60-84 moderate (2-5 hits like this), 30-50 weak, 5-15 only if ZERO results.
- If deep pages contain bio/details, use them to fill Career/Role/Company sections with specifics.

Return ONLY valid JSON:
{
  "person": {"name": "string", "title": "string", "company": "string", "location": "string", "email": "string|null", "linkedin": "string|null"},
  "company": {"name": "string", "industry": "string", "size": "string", "revenue": "string|null", "founded": "string|null", "headquarters": "string", "website": "string", "description": "string"},
  "sections": [{"title": "string", "items": [{"label": "string", "value": "string"}]}],
  "aiInsights": ["string", "string", "string"],
  "confidenceScore": number
}
If ZERO results, set title "Unknown - no public data found" and confidence 8. Otherwise curate intelligently.

Sections: Summary, Career, Role, Company, Activity, Leadership, Interests, Tech, Priorities, Signals, Challenges, Stakeholders, Relationships, Opportunities, Openers, Questions, Strategy, Risks, Confidence.`;

  const { result, provider } = await aiRegistry.generateJSON(prompt, { temperature: 0.2, maxTokens: 3500 });
  console.log(`[SearchHandler] AI done via ${provider}`);
  return result;
}

function buildCase(query: string, scrapedData: any, aiAnalysis: any, hasAiKey: boolean, aiError: string | null) {
  const id = Date.now().toString();
  const timestamp = new Date().toISOString();
  if (aiAnalysis) {
    return {
      id, query, timestamp,
      person: aiAnalysis.person || { name: query, title: "Unknown - no public data found", company: "Unknown", linkedin: scrapedData.linkedin?.url || "", location: "Unknown" },
      company: aiAnalysis.company || { name: "Unknown", industry: "Unknown", size: "Unknown", revenue: null, founded: null, headquarters: "Unknown", website: "", description: "No verifiable public information found." },
      sections: aiAnalysis.sections || [],
      aiInsights: aiAnalysis.aiInsights || [],
      confidenceScore: aiAnalysis.confidenceScore ?? 8,
      savedToPipeline: false,
      _sources: (scrapedData.web || []).slice(0, 5),
      _deepPages: scrapedData.deepPages || [],
    };
  }
  const web = scrapedData.web || [];
  return {
    id, query, timestamp,
    person: { name: query.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "), title: "", company: "", linkedin: scrapedData.linkedin?.url || "", location: "" },
    company: { name: "", industry: "", size: "", revenue: "", founded: "", headquarters: "", website: "", description: "" },
    sections: [{ title: "Web Results", icon: "Globe", items: web.slice(0, 5).map((r: any) => ({ label: r.title?.slice(0, 50) || "Result", value: `${r.snippet?.slice(0, 150) || ""} | ${r.url || ""}` })) }],
    aiInsights: [hasAiKey ? `AI key set (${process.env.GROQ_API_KEY ? "GROQ" : "GEMINI"}) but analysis failed` : "No AI keys", aiError ? `Error: ${aiError}` : "Check logs", `Crawled ${web.length} web results.`],
    confidenceScore: web.length ? 30 : 10,
    savedToPipeline: false,
    _sources: web.slice(0, 5),
  };
}
