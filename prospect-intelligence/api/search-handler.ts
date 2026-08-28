import { aiRegistry } from "../server/lib/ai-registry.js";

export async function searchProspectHandler(query: string) {
  console.log("[SearchHandler] Starting crawl for:", query);
  let scrapedData: any = {};

  // Multi-source crawl - runs in parallel, each with timeout
  const crawlResults = await crawlEverywhere(query);
  scrapedData = crawlResults;
  console.log("[SearchHandler] Crawl done. Sources:", Object.keys(crawlResults), "total snippets:", (crawlResults.web as any[])?.length);

  // Step 4: AI analysis - now grounded with real crawl data
  let aiAnalysis: any = null;
  let aiError: string | null = null;
  const hasAiKey = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
  console.log("[SearchHandler] hasAiKey:", hasAiKey);

  if (hasAiKey) {
    try {
      aiAnalysis = await analyzeWithAI(query, scrapedData);
      console.log("[SearchHandler] AI result:", JSON.stringify(aiAnalysis).substring(0, 400));
    } catch (e: any) {
      aiError = e?.message || String(e);
      console.error("[SearchHandler] AI error:", aiError);
    }
  }

  // Step 5: Build the case
  return buildCase(query, scrapedData, aiAnalysis, hasAiKey, aiError);
}

// New multi-source crawler - works on Vercel (Google is blocked there)
async function crawlEverywhere(query: string) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const timeout = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

  const fetchWithTimeout = async (url: string, opts: any = {}, ms = 12000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch(url, { ...opts, signal: ctrl.signal });
      return res;
    } finally { clearTimeout(t); }
  };

  // 1. DuckDuckGo HTML (most reliable on Vercel, rarely blocked)
  async function fetchDuckDuckGo(q: string) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } });
      const html = await res.text();
      const results: any[] = [];
      // DDG html pattern: <a class="result__url" href="...">, <h2 class="result__title">, <a class="result__snippet">
      const titleRegex = /<h2[^>]*class="[^"]*result__title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      const titles: any[] = [];
      while ((m = titleRegex.exec(html)) && titles.length < 10) {
        titles.push({ url: m[1], title: m[2].replace(/<[^>]+>/g, "").trim() });
      }
      const snippets: string[] = [];
      while ((m = snippetRegex.exec(html)) && snippets.length < 10) {
        snippets.push(m[1].replace(/<[^>]+>/g, "").trim());
      }
      for (let i = 0; i < titles.length; i++) {
        results.push({ title: titles[i].title, snippet: snippets[i] || "", url: titles[i].url, source: "duckduckgo" });
      }
      // Fallback simple parse if above fails
      if (results.length === 0) {
        const altRegex = /<a rel="nofollow" class="result__url" href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        while ((m = altRegex.exec(html)) && results.length < 8) {
          results.push({ title: m[2].trim(), snippet: "", url: m[1], source: "duckduckgo" });
        }
      }
      console.log("[Crawl] DuckDuckGo found", results.length);
      return results;
    } catch (e: any) {
      console.log("[Crawl] DuckDuckGo failed:", e.message);
      return [];
    }
  }

  // 2. Bing (second source)
  async function fetchBing(q: string) {
    try {
      const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=10`;
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" } });
      const html = await res.text();
      const results: any[] = [];
      const regex = /<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/gi;
      let m;
      while ((m = regex.exec(html)) && results.length < 10) {
        const url = m[1];
        if (url.startsWith("https://www.bing.com") || url.includes("microsoft.com")) continue;
        results.push({ title: m[2].replace(/<[^>]+>/g, "").trim(), snippet: "", url, source: "bing" });
      }
      // Try to get snippets
      const capRegex = /<div class="b_caption">[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
      let i = 0;
      while ((m = capRegex.exec(html)) && i < results.length) {
        results[i].snippet = m[1].replace(/<[^>]+>/g, "").trim().slice(0, 300);
        i++;
      }
      console.log("[Crawl] Bing found", results.length);
      return results;
    } catch (e: any) {
      console.log("[Crawl] Bing failed:", e.message);
      return [];
    }
  }

  // 3. Try to enrich top result via Jina reader (gets clean text from any URL, free)
  async function enrichTopUrl(url: string) {
    try {
      if (!url || !url.startsWith("http")) return null;
      const jinaUrl = `https://cc.bingj.com/cache.cgi?d=${encodeURIComponent(url)}&w=&u=1`;
      // Use Jina AI free reader as fallback: https://localhost:443/http://...
      const readerUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
      const res = await fetchWithTimeout(readerUrl, { headers: { "User-Agent": UA } }, 6000);
      const text = await res.text();
      return text.slice(0, 2500);
    } catch { return null; }
  }

  // Serper API (free 2500/month) - if SERPER_API_KEY set, use it. Most reliable on Vercel.
  async function fetchSerper(q: string) {
    const key = process.env.SERPER_API_KEY;
    if (!key) { console.log("[Crawl] Serper skipped - no key"); return []; }
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": key, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num: 10 }),
      });
      const data: any = await res.json();
      const results: any[] = (data.organic || []).slice(0, 10).map((r: any) => ({ title: r.title, snippet: r.snippet || "", url: r.link, source: "serper" }));
      console.log("[Crawl] Serper found", results.length);
      return results;
    } catch (e: any) { console.log("[Crawl] Serper failed:", e.message); return []; }
  }
  // CorsProxy + Lite DDG - bypasses Cloudflare, more reliable than AllOrigins
  async function fetchViaCorsProxy(q: string) {
    try {
      const target = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`;
      const url = `https://corsproxy.io/?${encodeURIComponent(target)}`;
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, 10000);
      const html = await res.text();
      console.log("[Crawl] CorsProxy html len", html.length, "snippet", html.slice(0, 300));
      const results: any[] = [];
      const regex = /<a rel="nofollow"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
      let m;
      while ((m = regex.exec(html)) && results.length < 8) {
        const href = m[1];
        let url = href;
        const uddg = href.match(/uddg=([^&]+)/);
        if (uddg) try { url = decodeURIComponent(uddg[1]); } catch {}
        if (url.includes("duckduckgo.com")) continue;
        results.push({ title: m[2].trim(), snippet: "", url, source: "corsproxy" });
      }
      // fallback Jina lite
      if (results.length === 0) {
        const jinaUrl = `https://r.jina.ai/http://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`;
        const r2 = await fetchWithTimeout(jinaUrl, { headers: { "User-Agent": UA } }, 9000);
        const txt = await r2.text();
        console.log("[Crawl] Jina-lite len", txt.length, txt.slice(0, 400));
        const linkRegex = /\[([^\]]{5,120})\]\((https?:\/\/[^\)]+)\)/g;
        let n;
        while ((n = linkRegex.exec(txt)) && results.length < 8) {
          if (n[2].includes("duckduckgo.com")) continue;
          results.push({ title: n[1].trim(), snippet: "", url: n[2], source: "jina-lite" });
        }
      }
      console.log("[Crawl] CorsProxy found", results.length);
      return results;
    } catch (e: any) { console.log("[Crawl] CorsProxy failed:", e.message); return []; }
  }
  async function fetchViaAllOrigins(q: string) {
    try {
      const target = encodeURIComponent(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`);
      const url = `https://api.allorigins.win/get?url=${target}`;
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, 15000);
      const data: any = await res.json();
      const html = data.contents || "";
      console.log("[Crawl] AllOrigins html len", html.length);
      const results: any[] = [];
      const regex = /<a rel="nofollow"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
      let m;
      while ((m = regex.exec(html)) && results.length < 8) {
        const href = m[1];
        let url = href;
        const uddg = href.match(/uddg=([^&]+)/);
        if (uddg) try { url = decodeURIComponent(uddg[1]); } catch {}
        if (url.includes("duckduckgo.com")) continue;
        results.push({ title: m[2].trim(), snippet: "", url, source: "allorigins" });
      }
      console.log("[Crawl] AllOrigins found", results.length);
      return results;
    } catch (e: any) { console.log("[Crawl] AllOrigins failed:", e.message); return []; }
  }
  // Jina-wrapped fetchers - bypass Vercel IP blocks (free, no key)
  async function fetchGoogleViaJina(q: string) {
    try {
      const jinaUrl = `https://r.jina.ai/https://www.google.com/search?q=${encodeURIComponent(q)}&num=10`;
      const res = await fetchWithTimeout(jinaUrl, { headers: { "User-Agent": UA, "Accept": "text/markdown", "X-Return-Format": "markdown" } }, 10000);
      const text = await res.text();
      console.log("[Crawl] Google-Jina text len", text.length, "snippet", text.slice(0, 400));
      if (text.includes("Just a moment") || text.includes("challenges.cloudflare")) { console.log("[Crawl] Google-Jina blocked by CF"); return []; }
      const results: any[] = [];
      const linkRegex = /\[([^\]]{5,150})\]\((https?:\/\/[^\)]+)\)/g;
      let m;
      while ((m = linkRegex.exec(text)) && results.length < 10) {
        const url = m[2];
        if (url.includes("google.com/search") || url.includes("googleusercontent") || url.includes("support.google")) continue;
        const title = m[1].trim().replace(/\*\*/g, "");
        results.push({ title, snippet: "", url, source: "google-jina" });
      }
      const lines = text.split("\n");
      for (let i = 0; i < results.length; i++) {
        const idx = lines.findIndex((l: any) => l.includes(results[i].url));
        if (idx >= 0 && lines[idx + 1]) results[i].snippet = lines[idx + 1].slice(0, 250);
      }
      console.log("[Crawl] Google-Jina found", results.length);
      return results;
    } catch (e: any) { console.log("[Crawl] Google-Jina failed:", e.message); return []; }
  }
  async function fetchViaJina(q: string) {
    try {
      const jinaUrl = `https://r.jina.ai/http://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      const res = await fetchWithTimeout(jinaUrl, { headers: { "User-Agent": UA, "Accept": "text/markdown" } }, 9000);
      const text = await res.text();
      const results: any[] = [];
      const linkRegex = /\[([^\]]{5,120})\]\((https?:\/\/[^\)]+)\)/g;
      let m;
      while ((m = linkRegex.exec(text)) && results.length < 8) {
        if (m[2].includes("duckduckgo.com") || m[2].includes("bing.com")) continue;
        results.push({ title: m[1].trim(), snippet: "", url: m[2], source: "jina" });
      }
      console.log("[Crawl] Jina found", results.length);
      return results;
    } catch (e: any) { console.log("[Crawl] Jina failed:", e.message); return []; }
  }

  const [ddg, bing, jina, gjina, serper, allorig, corsp] = await Promise.all([fetchDuckDuckGo(query), fetchBing(query), fetchViaJina(query), fetchGoogleViaJina(query), fetchSerper(query), fetchViaAllOrigins(query), fetchViaCorsProxy(query)]);
  const merged = [...serper, ...corsp, ...allorig, ...ddg, ...bing, ...jina, ...gjina];
  // Deduplicate by URL
  const seen = new Set();
  const web = merged.filter(r => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  }).slice(0, 12);

  // Find LinkedIn URL
  const linkedinHit = web.find(r => r.url.includes("linkedin.com/in/")) || null;
  const linkedin = linkedinHit ? { url: linkedinHit.url } : null;

  // Try to enrich top web result
  let enriched: string | null = null;
  if (web[0]?.url) {
    enriched = await enrichTopUrl(web[0].url);
  }

  return {
    web,
    google: web, // keep compat
    linkedin,
    company: { snippets: web.slice(0, 5).map(w => w.snippet).filter(Boolean) },
    enriched,
    rawCount: web.length,
  };
}

async function analyzeWithAI(query: string, scrapedData: any) {
  const webResults = (scrapedData.web || []).slice(0, 8).map((r: any, i: number) => `${i + 1}. Title: ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`).join("\n\n");
  const enriched = scrapedData.enriched ? `\n\nEnriched page content (top result):\n${scrapedData.enriched.slice(0, 2000)}` : "";
  const prompt = `You are a prospect intelligence analyst. Analyze "${query}" for sales intelligence.

FRESH WEB SEARCH RESULTS (use as PRIMARY source - this is real-time data crawled just now):
${webResults || "No web results returned - search engine blocked or no matches"}
${enriched}

CRITICAL RULES:
- GROUND your answer in the web results above. If web results contain relevant info about "${query}", EXTRACT it and build the dossier from those snippets/URLs. Do NOT say "no data" when results exist.
- ONLY hallucinate if truly zero relevant results. If results exist, confidence must reflect that.
- DO NOT invent titles/companies not in results. Use exact titles/companies found in snippets.
- confidenceScore: 85-95 if strong public figure with multiple results, 60-84 if moderate results (like this query with 2-5 relevant hits), 30-50 if weak/ambiguous, 5-15 only if ZERO relevant results.
- If results show this is a real professional (e.g. conference speaker, founder, employee), build full dossier from snippets - do not mark as unknown.

Return ONLY valid JSON matching this EXACT schema:
{
  "person": {"name": "string", "title": "string", "company": "string", "location": "string", "email": "string|null", "linkedin": "string|null"},
  "company": {"name": "string", "industry": "string", "size": "string", "revenue": "string|null", "founded": "string|null", "headquarters": "string", "website": "string", "description": "string"},
  "sections": [{"title": "string", "items": [{"label": "string", "value": "string"}]}],
  "aiInsights": ["string", "string", "string"],
  "confidenceScore": number
}

If ZERO relevant web results for "${query}", then and only then:
- person.title = "Unknown - no public data found"
- confidenceScore = 8
- Summary must say "No verifiable public information found for '${query}'..."

Otherwise, curate intelligently from the snippets above.

Sections must include: Summary, Career, Role, Company, Activity, Leadership, Interests, Tech, Priorities, Signals, Challenges, Stakeholders, Relationships, Opportunities, Openers, Questions, Strategy, Risks, Confidence.`;

  const { result, provider } = await aiRegistry.generateJSON(prompt, { temperature: 0.2, maxTokens: 3500 });
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
        title: "Unknown - no public data found",
        company: "Unknown",
        linkedin: scrapedData.linkedin?.url || "",
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
      _sources: (scrapedData.web || []).slice(0, 5),
    };
  }

  const web = scrapedData.web || scrapedData.google || [];
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
        title: "Web Results",
        icon: "Globe",
        items: web.slice(0, 5).map((r: any) => ({
          label: r.title?.slice(0, 50) || "Result",
          value: `${r.snippet?.slice(0, 150) || ""} | ${r.url || ""}`,
        })),
      },
    ],
    aiInsights: [
      hasAiKey ? `AI key is set (${process.env.GROQ_API_KEY ? "GROQ" : "GEMINI"}) but analysis failed` : "No AI API keys configured",
      aiError ? `Error: ${aiError}` : "Check Vercel function logs for details",
      `Crawled ${web.length} web results.`,
    ],
    confidenceScore: web.length ? 30 : 10,
    savedToPipeline: false,
    _sources: web.slice(0, 5),
  };
}
