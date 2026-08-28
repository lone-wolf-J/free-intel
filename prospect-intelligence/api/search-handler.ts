import { aiRegistry } from "../server/lib/ai-registry.js";

// Simple in-memory cache (persists for warm Vercel functions, ~7-day logical TTL via timestamp check)
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export async function searchProspectHandler(query: string) {
  const normalized = query.toLowerCase().trim();
  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log("[Cache] HIT for", query);
    return { ...cached.data, _cached: true };
  }
  console.log("[SearchHandler] Starting crawl for:", query);
  const crawlResults = await crawlEverywhere(query);
  console.log("[SearchHandler] Crawl done. web:", (crawlResults.web as any[])?.length, "deep:", crawlResults.deepPages?.length);

  let aiAnalysis: any = null;
  let aiError: string | null = null;
  const hasAiKey = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.TINYFISH_API_KEY);
  if (hasAiKey) {
    try {
      aiAnalysis = await analyzeWithAI(query, crawlResults);
      console.log("[SearchHandler] AI done");
    } catch (e: any) {
      aiError = e?.message || String(e);
      console.error("[SearchHandler] AI error:", aiError);
      // Tinyfish fallback as LLM if Groq fails
      if (process.env.TINYFISH_API_KEY && aiError.includes("Groq")) {
        try {
          console.log("[Fallback] Trying Tinyfish LLM...");
          aiAnalysis = await analyzeWithTinyfish(query, crawlResults);
        } catch (e2: any) { console.log("[Fallback] Tinyfish also failed", e2.message); }
      }
    }
  }
  const result = buildCase(query, crawlResults, aiAnalysis, hasAiKey, aiError);
  // Cache successful results with confidence >30
  if (result.confidenceScore > 30) cache.set(normalized, { data: result, ts: Date.now() });
  // Keep cache size bounded
  if (cache.size > 200) {
    const firstKey = cache.keys().next().value as string;
    cache.delete(firstKey);
  }
  return result;
}

async function crawlEverywhere(query: string) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
  const fetchWithTimeout = async (url: string, opts: any = {}, ms = 12000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch(url, { ...opts, signal: ctrl.signal });
      return res;
    } finally { clearTimeout(t); }
  };

  // ---------- Tier 1: SEARCH (quota-aware, priority order) ----------
  async function fetchSerper(q: string) {
    const key = process.env.SERPER_API_KEY;
    if (!key) return [];
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch("https://google.serper.dev/search", { method: "POST", headers: { "X-API-KEY": key, "Content-Type": "application/json" }, body: JSON.stringify({ q, num: 10 }) });
      const data: any = await res.json();
      const results = (data.organic || []).slice(0, 10).map((r: any) => ({ title: r.title, snippet: r.snippet || "", url: r.link, source: "serper" }));
      console.log("[Crawl] Serper", results.length); return results;
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
      console.log("[Crawl] Tavily", results.length); return results;
    } catch (e: any) { console.log("[Crawl] Tavily fail", e.message); return []; }
  }
  async function fetchBrave(q: string) {
    const key = process.env.BRAVE_API_KEY;
    if (!key) return [];
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=10`, { headers: { "X-Subscription-Token": key, "Accept": "application/json" } });
      const data: any = await res.json();
      const results = (data.web?.results || []).slice(0, 8).map((r: any) => ({ title: r.title, snippet: r.description || "", url: r.url, source: "brave" }));
      console.log("[Crawl] Brave", results.length); return results;
    } catch (e: any) { console.log("[Crawl] Brave fail", e.message); return []; }
  }
  async function fetchSerpApi(q: string) {
    const key = process.env.SERPAPI_KEY;
    if (!key) return [];
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&api_key=${key}`);
      const data: any = await res.json();
      const results = (data.organic_results || []).slice(0, 8).map((r: any) => ({ title: r.title, snippet: r.snippet || "", url: r.link, source: "serpapi" }));
      console.log("[Crawl] SerpApi", results.length); return results;
    } catch (e: any) { console.log("[Crawl] SerpApi fail", e.message); return []; }
  }
  async function fetchBingApi(q: string) {
    const key = process.env.BING_API_KEY;
    if (!key) return [];
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(q)}&count=8`, { headers: { "Ocp-Apim-Subscription-Key": key } });
      const data: any = await res.json();
      const results = (data.webPages?.value || []).slice(0, 8).map((r: any) => ({ title: r.name, snippet: r.snippet || "", url: r.url, source: "bing-api" }));
      console.log("[Crawl] BingAPI", results.length); return results;
    } catch (e: any) { console.log("[Crawl] BingAPI fail", e.message); return []; }
  }
  async function fetchWikipedia(q: string) {
    try {
      const res = await fetchWithTimeout(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=5&origin=*`, {}, 6000);
      const data: any = await res.json();
      const results = (data.query?.search || []).slice(0, 3).map((r: any) => ({ title: r.title, snippet: r.snippet?.replace(/<[^>]+>/g, "").slice(0, 300) || "", url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`, source: "wikipedia" }));
      console.log("[Crawl] Wikipedia", results.length); return results;
    } catch (e: any) { console.log("[Crawl] Wikipedia fail", e.message); return []; }
  }
  // Free fallbacks (zero cost, flaky but worth trying)
  async function fetchDuckDuckGo(q: string) {
    try {
      const res = await fetchWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { headers: { "User-Agent": UA } });
      const html = await res.text();
      const results: any[] = []; const altRegex = /<a rel="nofollow" class="result__url" href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
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

  // Tier 1 execution: Serper primary, others only if Serper <3 to save quota
  const serperResults = await fetchSerper(query);
  let tavilyResults: any[] = []; let braveResults: any[] = []; let serpApiResults: any[] = []; let bingApiResults: any[] = []; let wikiResults: any[] = [];
  if (serperResults.length < 3) {
    console.log("[Crawl] Serper low, trying Tavily + Brave + SerpApi...");
    const [tav, brave, serpapi, bingapi, wiki] = await Promise.all([fetchTavily(query), fetchBrave(query), fetchSerpApi(query), fetchBingApi(query), fetchWikipedia(query)]);
    tavilyResults = tav; braveResults = brave; serpApiResults = serpapi; bingApiResults = bingapi; wikiResults = wiki;
  } else {
    console.log("[Crawl] Serper sufficient, skipping paid fallbacks to save quota");
    wikiResults = await fetchWikipedia(query); // Wikipedia is free, always run
  }

  const [ddg, allorig] = await Promise.all([fetchDuckDuckGo(query), fetchViaAllOrigins(query)]);
  const mergedSearch = [...serperResults, ...tavilyResults, ...braveResults, ...serpApiResults, ...bingApiResults, ...wikiResults, ...ddg, ...allorig];
  const seen = new Set(); const web = mergedSearch.filter((r: any) => { if (!r.url || seen.has(r.url)) return false; seen.add(r.url); return true; }).slice(0, 12);
  console.log("[Crawl] Tier1 total", web.length, "sources:", [...new Set(web.map((w: any) => w.source))].join(","));

  // ---------- Tier 2: DEEP SCRAPE (balanced rotation) ----------
  const hash = query.split("").reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
  const deepPages: any[] = [];
  const topUrls = web.slice(0, 3).map((w: any) => w.url).filter(Boolean);

  async function deepScrapeScrapeDo(url: string) {
    const key = process.env.SCRAPE_DO_KEY || process.env.SCRAPE_DO_TOKEN;
    if (!key) return null;
    try {
      const res = await fetchWithTimeout(`https://api.scrape.do?token=${key}&url=${encodeURIComponent(url)}&render=true`, {}, 10000);
      const text = await res.text();
      console.log("[Deep] Scrape.do", url.slice(0, 40), "len", text.length);
      return text.slice(0, 3500);
    } catch (e: any) { console.log("[Deep] Scrape.do fail", e.message); return null; }
  }
  async function deepScrapeFirecrawl(url: string) {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) return null;
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch("https://api.firecrawl.dev/v1/scrape", { method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 1500 }) });
      const data: any = await res.json();
      const md = data.data?.markdown || data.markdown || "";
      console.log("[Deep] Firecrawl", url.slice(0, 40), "len", md.length);
      return md.slice(0, 3500);
    } catch (e: any) { console.log("[Deep] Firecrawl fail", e.message); return null; }
  }
  async function deepScrapeJina(url: string) {
    try {
      const res = await fetchWithTimeout(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`, { headers: { "User-Agent": UA } }, 8000);
      const text = await res.text(); console.log("[Deep] Jina", url.slice(0, 40), "len", text.length); return text.slice(0, 3500);
    } catch (e: any) { console.log("[Deep] Jina fail", e.message); return null; }
  }
  async function deepScrapeScrapingBee(url: string) {
    const key = process.env.SCRAPINGBEE_API_KEY;
    if (!key) return null;
    try {
      const res = await fetchWithTimeout(`https://app.scrapingbee.com/api/v1/?api_key=${key}&url=${encodeURIComponent(url)}&render_js=false`, {}, 10000);
      const text = await res.text(); console.log("[Deep] ScrapingBee", url.slice(0, 40), "len", text.length); return text.slice(0, 3500);
    } catch (e: any) { console.log("[Deep] ScrapingBee fail", e.message); return null; }
  }
  async function deepScrapeZenRows(url: string) {
    const key = process.env.ZENROWS_API_KEY;
    if (!key) return null;
    try {
      const res = await fetchWithTimeout(`https://api.zenrows.com/v1/?apikey=${key}&url=${encodeURIComponent(url)}&autoparse=false`, {}, 10000);
      const text = await res.text(); console.log("[Deep] ZenRows", url.slice(0, 40), "len", text.length); return text.slice(0, 3500);
    } catch (e: any) { console.log("[Deep] ZenRows fail", e.message); return null; }
  }

  for (let i = 0; i < topUrls.length; i++) {
    const url = topUrls[i];
    let content: string | null = null;
    const choice = (hash + i) % 5;
    // Rotate 5-way: Firecrawl, Scrape.do, ScrapingBee, ZenRows, Jina - balances all free tiers
    if (choice === 0) content = await deepScrapeFirecrawl(url) || await deepScrapeScrapeDo(url) || await deepScrapeJina(url);
    else if (choice === 1) content = await deepScrapeScrapeDo(url) || await deepScrapeFirecrawl(url) || await deepScrapeJina(url);
    else if (choice === 2) content = await deepScrapeScrapingBee(url) || await deepScrapeJina(url);
    else if (choice === 3) content = await deepScrapeZenRows(url) || await deepScrapeJina(url);
    else content = await deepScrapeJina(url) || await deepScrapeScrapeDo(url) || await deepScrapeFirecrawl(url);
    if (content) deepPages.push({ url, content: content.slice(0, 2000) });
  }

  // ---------- Tier 3: ENRICHMENT ----------
  async function fetchExplorium(q: string) {
    const key = process.env.EXPLORIUM_API_KEY;
    if (!key) return null;
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch(`https://api.explorium.ai/v1/prospects?query=${encodeURIComponent(q)}`, { headers: { "api_key": key, "Content-Type": "application/json" } });
      const data: any = await res.json();
      console.log("[Enrich] Explorium", JSON.stringify(data).slice(0, 300)); return data;
    } catch (e: any) { console.log("[Enrich] Explorium fail", e.message); return null; }
  }
  async function fetchTinyfishEnrich(q: string, snippets: string) {
    const key = process.env.TINYFISH_API_KEY;
    if (!key) return null;
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch("https://api.tinyfish.ai/v1/chat/completions", { method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "tinyfish", messages: [{ role: "user", content: `Enrich prospect "${q}" given snippets:\n${snippets.slice(0, 1500)}\n\nReturn 2-3 concise insights about role/company/industry.` }], max_tokens: 400 }) });
      const data: any = await res.json();
      const text = data.choices?.[0]?.message?.content || data.output || "";
      console.log("[Enrich] Tinyfish", text.slice(0, 200)); return text.slice(0, 800);
    } catch (e: any) { console.log("[Enrich] Tinyfish fail", e.message); return null; }
  }
  async function fetchPublicApis() {
    try {
      const res = await fetchWithTimeout("https://api.publicapis.org/entries?category=business&https=true", {}, 5000);
      const data: any = await res.json();
      const entries = (data.entries || []).slice(0, 3).map((e: any) => `${e.API}: ${e.Description} (${e.Link})`).join("; ");
      console.log("[Enrich] PublicAPIs", entries.slice(0, 200)); return entries;
    } catch (e: any) { console.log("[Enrich] PublicAPIs fail", e.message); return null; }
  }
  // Public APIs repo as discovery source - fetch README via Jina for free API list
  async function fetchPublicApisRepo(q: string) {
    try {
      const res = await fetchWithTimeout("https://r.jina.ai/https://raw.githubusercontent.com/public-apis/public-apis/master/README.md", {}, 6000);
      const text = await res.text();
      // Find relevant categories for this query
      const relevant = text.split("\n").filter((l: string) => l.toLowerCase().includes(q.split(" ")[0].toLowerCase())).slice(0, 3).join(" | ").slice(0, 500);
      console.log("[Enrich] PublicAPIs Repo", relevant.slice(0, 100)); return relevant || null;
    } catch (e: any) { console.log("[Enrich] Repo fail", e.message); return null; }
  }

  const webSnippets = web.map((w: any) => w.snippet).join(" ").slice(0, 1500);
  const [explorium, tinyfish, publicApis, publicRepo] = await Promise.all([fetchExplorium(query), fetchTinyfishEnrich(query, webSnippets), fetchPublicApis(), fetchPublicApisRepo(query)]);

  const linkedinHit = web.find((r: any) => r.url.includes("linkedin.com/in/")) || null;
  const linkedin = linkedinHit ? { url: linkedinHit.url } : null;

  return {
    web, google: web, linkedin, company: { snippets: web.slice(0, 5).map((w: any) => w.snippet).filter(Boolean) },
    deepPages, enrichment: { explorium, tinyfish, publicApis: [publicApis, publicRepo].filter(Boolean).join(" | "), rawPublicApis: publicApis },
    rawCount: web.length,
  };
}

async function analyzeWithTinyfish(query: string, scrapedData: any): Promise<any> {
  const key = process.env.TINYFISH_API_KEY!;
  const webResults = (scrapedData.web || []).slice(0, 5).map((r: any, i: number) => `${i + 1}. ${r.title} - ${r.snippet} (${r.url})`).join("\n");
  const prompt = `Analyze "${query}" - Web results:\n${webResults}\n\nReturn JSON with person, company, sections (Summary,Career,Role,Company,Activity,Leadership,Interests,Tech,Priorities,Signals,Challenges,Stakeholders,Relationships,Opportunities,Openers,Questions,Strategy,Risks,Confidence), aiInsights (3), confidenceScore. Use web results as source, don't hallucinate.`;
  const nodeFetch = (await import("node-fetch")).default;
  const res: any = await nodeFetch("https://api.tinyfish.ai/v1/chat/completions", { method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "tinyfish", messages: [{ role: "user", content: prompt }], temperature: 0.2, max_tokens: 3000 }) });
  const data: any = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Tinyfish no JSON");
  return JSON.parse(jsonMatch[0]);
}

async function analyzeWithAI(query: string, scrapedData: any) {
  const webResults = (scrapedData.web || []).slice(0, 8).map((r: any, i: number) => `${i + 1}. Title: ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`).join("\n\n");
  const deepContent = (scrapedData.deepPages || []).map((d: any, i: number) => `Deep Page ${i + 1} (${d.url}):\n${d.content?.slice(0, 1500)}`).join("\n\n");
  const enrich = scrapedData.enrichment ? `\n\nEnrichment:\n- Explorium: ${JSON.stringify(scrapedData.enrichment.explorium)?.slice(0, 600) || "none"}\n- Tinyfish: ${scrapedData.enrichment.tinyfish?.slice(0, 600) || "none"}\n- PublicAPIs: ${scrapedData.enrichment.publicApis?.slice(0, 400) || "none"}` : "";

  const prompt = `You are a prospect intelligence analyst. Analyze "${query}" for sales intelligence.

FRESH WEB SEARCH (PRIMARY - ${scrapedData.web?.length || 0} results):
${webResults || "No web results"}

DEEP PAGE CONTENT (Firecrawl/Scrape.do/Jina - use for depth):
${deepContent || "No deep pages"}
${enrich}

CRITICAL RULES:
- GROUND in web + deep content above. If results exist, EXTRACT exact titles/companies/locations. Do NOT say "no data" when results exist.
- confidenceScore: 85-95 strong public figure, 60-84 moderate (2-5 hits), 30-50 weak, 5-15 only if ZERO results.
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
