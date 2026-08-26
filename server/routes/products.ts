import { Hono } from "hono";
import { j } from "../lib/util";
import type { Env } from "../lib/util";
import { findAlternatives, ALTERNATIVES_DB, type AltAlternative } from "../db/alternatives-seed";

export const productsApp = new Hono<{ Bindings: Env }>();

const UA = { "User-Agent": "FreeIntelBot/1.0 (+https://free-intel.dev; discovery bot)", Accept: "text/html" };

productsApp.post("/products/resolve", async (c) => {
  const b = await c.req.json().catch(() => ({}) as any);
  const name = String(b?.name || "").trim().slice(0, 80);
  if (!name) return c.json({ error: "name_required" }, 400);

  const lower = name.toLowerCase();
  let r =
    (await c.env.DB.prepare("SELECT * FROM resources WHERE LOWER(name)=? LIMIT 1").bind(lower).first()) ||
    (await c.env.DB.prepare("SELECT * FROM resources WHERE slug=? LIMIT 1").bind(lower.replace(/[^a-z0-9]+/g, "-")).first()) ||
    (await c.env.DB.prepare(
      `SELECT r.* FROM product_aliases a JOIN resources r ON r.id=a.resource_id WHERE a.alias_lower=? LIMIT 1`
    ).bind(lower).first());

  let resolvedVia = "database";
  if (!r && c.env.GEMINI_API_KEY) {
    const { resolveProductUrls } = await import("../lib/discovery");
    const out = await resolveProductUrls(c.env.DB, c.env, name);
    if (out.resource_id) {
      r = await c.env.DB.prepare("SELECT * FROM resources WHERE id=?").bind(out.resource_id).first();
      resolvedVia = "live-resolution";
    } else if (out.blocked) {
      return c.json({
        resolved: false,
        message: `The engine identified official URLs for "${name}" but the vendor blocks automated access. Nothing will be fabricated — submit the URL manually or enter your spend directly; alternatives appear when verified replacements are discovered.`,
        resolution: null,
        alternatives: findAlternatives(name)?.alternatives || []
      });
    }
  }

  const seedMatch = findAlternatives(name);
  const seedAlternatives = seedMatch?.alternatives || [];
  const currentPrice = seedMatch?.price_month || null;

  if (!r) {
    return c.json({
      resolved: false,
      message: `"${name}" is not in the discovered database yet${c.env.GEMINI_API_KEY ? "" : " and live URL resolution is unavailable (no LLM key configured)"}. You can still enter your actual spend — alternatives will appear once the discovery engine finds verified replacements.`,
      resolution: null,
      current_price: currentPrice,
      alternatives: seedAlternatives
    });
  }

  const evidence = await c.env.DB.prepare(
    "SELECT claim, source_url, evidence_text, retrieved_at, method, confidence FROM evidence WHERE resource_id=? ORDER BY confidence DESC, id DESC LIMIT 8"
  ).bind(r.id).all();

  let plans = j<any[]>(r.plans_json, []);
  if ((r.pricing_url || r.url) && (!r.price_last_checked || plans.length === 0)) {
    if (r.pricing_url) {
      try {
        const { enqueue, processCrawlBatch } = await import("../lib/discovery");
        await enqueue(c.env.DB, "pricing_check", { slug: r.slug }, 2);
        await processCrawlBatch(c.env, { maxFetches: 1 });
        const fresh = await c.env.DB.prepare("SELECT plans_json, price_last_checked, content_hash FROM resources WHERE id=?").bind(r.id).first();
        plans = j<any[]>(fresh?.plans_json, []);
        r.price_last_checked = fresh?.price_last_checked ?? r.price_last_checked;
      } catch { /* pricing check failed; stay honest about it */ }
    }
  }

  return c.json({
    resolved: true,
    resolved_via: resolvedVia,
    product: {
      slug: r.slug,
      name: r.name,
      provider: r.provider,
      category: r.category,
      description: r.description,
      website: r.url,
      pricing_url: r.pricing_url,
      pricing_last_checked: r.price_last_checked || null,
      plans,
      free_types: j<string[]>(r.free_types, [])
    },
    pricing_status: plans.length ? "EXTRACTED_FROM_OFFICIAL_PAGE" : r.pricing_url ? "PAGE_KNOWN_NOT_MACHINE_EXTRACTED" : "NO_PRICING_DATA",
    evidence: evidence.results || [],
    current_price: currentPrice || (plans.length > 0 ? plans.find((p: any) => p.price_month > 0)?.price_month : null),
    alternatives: seedAlternatives
  });
});

productsApp.post("/products/search-alternatives", async (c) => {
  const b = await c.req.json().catch(() => ({}) as any);
  const toolName = String(b?.tool || "").trim().slice(0, 80);
  if (!toolName) return c.json({ error: "tool_required" }, 400);

  const lower = toolName.toLowerCase();
  const results: Array<{ name: string; slug: string; url: string; description: string; score: number; efficiency: number; source: string; reasoning: string; key_differences: string[] }> = [];

  // 1. Check seed database
  const seedMatch = findAlternatives(toolName);
  if (seedMatch) {
    for (const alt of seedMatch.alternatives) {
      results.push({
        name: alt.name,
        slug: alt.slug,
        url: alt.url,
        description: alt.description,
        score: alt.score,
        efficiency: alt.efficiency,
        source: "verified-alternatives",
        reasoning: alt.reasoning,
        key_differences: alt.key_differences
      });
    }
  }

  // 2. Search DB for resources with alt_of matching (exclude the tool itself)
  const dbAlts = await c.env.DB.prepare(
    `SELECT slug, name, description, url, free_score, alt_of, alt_kind
     FROM resources
     WHERE verification_status != 'expired'
       AND LOWER(name) != ?
       AND slug != ?
       AND (alt_of = ? OR LOWER(name) LIKE ? OR description LIKE ?)
     ORDER BY free_score DESC LIMIT 10`
  ).bind(lower, lower.replace(/[^a-z0-9]+/g, "-"), lower, `%${lower}%`, `%alternative to ${toolName}%`).all();

  for (const row of (dbAlts.results || []) as any[]) {
    if (results.some(r => r.slug === row.slug)) continue;
    const rowLower = (row.name || "").toLowerCase().trim();
    const rowSlug = (row.slug || "").toLowerCase().trim();
    // Skip if this IS the tool we're searching alternatives for
    const toolWords = lower.split(/\s+/);
    const rowWords = rowLower.split(/\s+/);
    if (toolWords[0] === rowWords[0]) continue;
    if (rowLower === lower || rowSlug === lower.replace(/[^a-z0-9]+/g, "-")) continue;
    results.push({
      name: row.name,
      slug: row.slug,
      url: row.url || `https://github.com/${row.slug}`,
      description: row.description?.slice(0, 200) || "",
      score: row.free_score || 0,
      efficiency: Math.min(95, (row.free_score || 0) + 5),
      source: "discovery-engine",
      reasoning: `Discovered by the crawling engine as a potential alternative. Score ${row.free_score || 0}/100.`,
      key_differences: []
    });
  }

  // 3. If fewer than 3 results, use LLM to suggest alternatives
  if (results.length < 3 && c.env.GEMINI_API_KEY) {
    const { llmJson } = await import("../lib/llm");
    const llmResult = await llmJson(c.env,
      `For the paid tool "${toolName}", suggest 3-5 free or open-source alternatives. For each, provide: name, url (official site or GitHub), description (1 sentence), score (0-100 how good it is as a replacement), reasoning (1-2 sentences why it's a good alternative), key_differences (array of 2-3 key differences). Respond ONLY with JSON: {"alternatives":[{"name":"...","url":"...","description":"...","score":0,"reasoning":"...","key_differences":["..."]}]}`,
      800
    );

    if (llmResult?.alternatives) {
      for (const alt of llmResult.alternatives) {
        if (results.some(r => r.name.toLowerCase() === alt.name?.toLowerCase())) continue;
        if (alt.name?.toLowerCase() === lower) continue;
        const slug = (alt.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        results.push({
          name: alt.name || "Unknown",
          slug,
          url: alt.url || "",
          description: alt.description || "",
          score: Math.min(100, Math.max(0, alt.score || 70)),
          efficiency: Math.min(95, Math.max(30, (alt.score || 70) - 5)),
          source: "llm-suggested",
          reasoning: alt.reasoning || "Suggested by AI analysis of the tool's category and features.",
          key_differences: Array.isArray(alt.key_differences) ? alt.key_differences.slice(0, 3) : []
        });
      }
    }
  }

  // 4. Search GitHub for "alternative to [tool]" repos
  if (results.length < 5 && c.env.GITHUB_TOKEN) {
    try {
      const ghRes = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(`alternative to ${toolName}`)}&sort=stars&order=desc&per_page=5`,
        {
          headers: {
            "User-Agent": "FreeIntelBot/1.0",
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${c.env.GITHUB_TOKEN}`
          }
        }
      );
      if (ghRes.ok) {
        const ghData: any = await ghRes.json();
        for (const item of ghData.items || []) {
          if (results.some(r => r.slug === item.full_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-"))) continue;
          if (item.name?.toLowerCase() === lower || item.full_name?.toLowerCase().includes(lower)) continue;
          const slug = item.full_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "";
          results.push({
            name: item.name || "Unknown",
            slug,
            url: item.html_url || "",
            description: (item.description || "").slice(0, 200),
            score: Math.min(80, Math.max(30, Math.round((item.stargazers_count || 0) / 100))),
            efficiency: Math.min(75, Math.max(25, Math.round((item.stargazers_count || 0) / 120))),
            source: "github-search",
            reasoning: `GitHub repository with ${item.stargazers_count || 0} stars. ${item.description ? `Description: "${(item.description || "").slice(0, 100)}"` : ""}`,
            key_differences: []
          });
        }
      }
    } catch { /* GitHub search failed */ }
  }

  return c.json({
    tool: toolName,
    in_seed_database: !!seedMatch,
    results: results.slice(0, 10),
    sources_checked: ["verified-alternatives", "discovery-engine", "llm-analysis", "github-search"]
  });
});

productsApp.get("/products/alternatives", (c) => {
  const q = c.req.query("q") || "";
  if (!q) return c.json({ products: ALTERNATIVES_DB.map(p => ({ name: p.name, category: p.category, price_month: p.price_month })) });
  const lower = q.toLowerCase();
  const matches = ALTERNATIVES_DB.filter(p =>
    p.name.toLowerCase().includes(lower) ||
    p.aliases.some(a => a.includes(lower)) ||
    p.category.toLowerCase().includes(lower)
  );
  return c.json({ products: matches.map(p => ({ name: p.name, category: p.category, price_month: p.price_month, alternatives: p.alternatives })) });
});
