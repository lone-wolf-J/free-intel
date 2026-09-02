import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";
dotenv.config();
import { validateQuery, checkRateLimit } from "./_security.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!checkRateLimit(req, "candidates")) return res.status(429).json({ error: "Too many requests" });
  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json")) return res.status(400).json({ error: "Content-Type must be application/json" });

  let query: string;
  try {
    query = validateQuery(req.body?.query);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }

  try {
    const { searchProspectHandler } = await import("./search-handler.js");
    // Lightweight: we want candidates, not full dossier. Use internal crawl with limited AI.
    // Reuse crawlEverywhere via a lightweight helper - call Serper directly for speed
    const candidates = await getCandidates(query);
    return res.status(200).json({ query, candidates, count: candidates.length });
  } catch (e: any) {
    console.error("[Candidates] Error", e);
    return res.status(500).json({ error: e.message || "Failed to get candidates" });
  }
}

async function getCandidates(query: string) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const fetchWithTimeout = async (url: string, opts: any = {}, ms = 8000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch(url, { ...opts, headers: { "User-Agent": UA, ...(opts.headers||{}) }, signal: ctrl.signal });
      return res;
    } finally { clearTimeout(t); }
  };

  let web: any[] = [];

  // Try Serper first (most reliable)
  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch("https://google.serper.dev/search", { method: "POST", headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" }, body: JSON.stringify({ q: query, num: 10 }) });
      const data: any = await res.json();
      web = (data.organic || []).slice(0, 10).map((r: any) => ({ title: r.title, snippet: r.snippet || "", url: r.link, source: "serper" }));
      console.log("[Candidates] Serper", web.length);
    } catch (e) { console.log("[Candidates] Serper fail", e); }
  }
  // Fallback to Tavily if no Serper results
  if (web.length < 3 && process.env.TAVILY_API_KEY) {
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const res: any = await nodeFetch("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: 8 }) });
      const data: any = await res.json();
      const tav = (data.results || []).slice(0, 8).map((r: any) => ({ title: r.title, snippet: r.content?.slice(0, 200) || "", url: r.url, source: "tavily" }));
      const seen = new Set(web.map((w: any) => w.url));
      for (const r of tav) if (!seen.has(r.url)) web.push(r);
      console.log("[Candidates] Tavily", tav.length);
    } catch (e) { console.log("[Candidates] Tavily fail", e); }
  }
  // If still low, try Wikipedia + AllOrigins
  if (web.length < 3) {
    try {
      const res = await fetchWithTimeout(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5`, {}, 5000);
      const data: any = await res.json();
      const wiki = (data.query?.search || []).slice(0, 3).map((r: any) => ({ title: r.title, snippet: r.snippet?.replace(/<[^>]+>/g, "").slice(0, 200) || "", url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`, source: "wikipedia" }));
      web.push(...wiki);
    } catch {}
  }

  function extractContacts(text: string, url: string) {
    const contacts: any[] = [];
    const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    const phoneRe = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const emails = text.match(emailRe) || [];
    const phones = text.match(phoneRe) || [];
    const seen = new Set<string>();
    for (const e of emails.slice(0, 2)) {
      const lower = e.toLowerCase();
      if (seen.has(lower) || lower.includes("example.com")) continue;
      seen.add(lower);
      // Confidence: 90 if appears near query name, else 70
      const idx = text.toLowerCase().indexOf(lower);
      const nearName = text.toLowerCase().slice(Math.max(0, idx - 80), idx + 80).includes(query.toLowerCase().split(" ")[0]);
      contacts.push({ type: "email", value: lower, confidence: nearName ? 90 : 70 });
    }
    for (const p of phones.slice(0, 1)) {
      if (p.replace(/\D/g, "").length < 10) continue;
      contacts.push({ type: "phone", value: p.trim(), confidence: 60 });
    }
    if (url.includes("linkedin.com/in/")) {
      contacts.push({ type: "linkedin", value: url, confidence: 95 });
    }
    return contacts;
  }

  // Build candidates from web results - extract person-like entries
  const candidates: any[] = [];
  const queryLower = query.toLowerCase();

  for (let i = 0; i < Math.min(web.length, 8); i++) {
    const r = web[i];
    const titleLower = (r.title || "").toLowerCase();
    const snippetLower = (r.snippet || "").toLowerCase();
    let confidence = 30;
    if (titleLower.includes(queryLower)) confidence = 75;
    else if (snippetLower.includes(queryLower)) confidence = 60;
    else if (r.url.includes("wikipedia.org")) confidence = 85;
    else if (r.url.includes("linkedin.com")) confidence = 65;
    if (/CEO|CTO|COO|founder|professor|actor|director|engineer/i.test(r.snippet)) confidence += 10;
    confidence = Math.min(95, confidence);

    const locationMatch = r.snippet.match(/(?:in|from|based in|located in)\s+([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)?)/);
    const companyMatch = r.snippet.match(/(?:at|with|for|@)\s+([A-Z][A-Za-z0-9\s&\.]+(?:Inc|LLC|Ltd|Corp|Company|University|Studios)?)/);

    const contacts = extractContacts(`${r.title} ${r.snippet} ${r.url}`, r.url);

    candidates.push({
      id: `${i}-${Date.now()}`,
      name: r.title.split(" - ")[0].split(" | ")[0].slice(0, 60).trim() || query,
      title: companyMatch ? companyMatch[1].trim().slice(0, 50) : (r.snippet.match(/(voice actor|actor|CEO|CTO|professor|engineer|founder)/i)?.[0] || "Unknown"),
      company: companyMatch ? companyMatch[1].trim().slice(0, 50) : (r.title.includes(" - ") ? r.title.split(" - ")[1]?.slice(0, 40) : ""),
      location: locationMatch ? locationMatch[1] : "",
      snippet: r.snippet.slice(0, 180),
      url: r.url,
      source: r.source,
      confidence,
      contacts,
    });
  }

  // If we have good AI, refine candidates with Groq for better titles/companies
  if (process.env.GROQ_API_KEY && candidates.length >= 2) {
    try {
      const { aiRegistry } = await import("../server/lib/ai-registry.js");
      const prompt = `Given search results for "${query}", rank and refine these candidates. Return ONLY JSON array with objects {name, title, company, location, confidence} (confidence 0-100 based on match to query):\n\n${candidates.slice(0, 5).map((c, i) => `${i + 1}. Title: ${c.name}\n   Snippet: ${c.snippet}\n   URL: ${c.url}`).join("\n\n")}\n\nReturn JSON array, no markdown.`;
      const { result } = await aiRegistry.generateJSON<any[]>(prompt, { temperature: 0.1, maxTokens: 1000 });
      if (Array.isArray(result) && result.length) {
        console.log("[Candidates] AI refined", result.length);
        return result.slice(0, 5).map((r: any, i: number) => ({
          ...candidates[i],
          name: r.name || candidates[i].name,
          title: r.title || candidates[i].title,
          company: r.company || candidates[i].company,
          location: r.location || candidates[i].location,
          confidence: r.confidence ?? candidates[i].confidence,
        }));
      }
    } catch (e) { console.log("[Candidates] AI refine failed", e); }
  }

  // Sort by confidence desc, dedupe by name+company
  const seen = new Set();
  const deduped = candidates.filter(c => {
    const key = `${c.name.toLowerCase()}|${c.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a, b) => b.confidence - a.confidence).slice(0, 5);

  console.log("[Candidates] Final", deduped.length);
  return deduped;
}
