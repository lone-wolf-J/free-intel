import { Hono } from "hono";
import { DEALS_SEED, type Deal } from "../db/deals-seed";

const dealsApp = new Hono();

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface LiveDeal {
  name: string;
  slug: string;
  url: string;
  description: string;
  category: string;
  deal_type: "free_tier" | "limited_promotion" | "open_source" | "free_credits";
  deal_detail: string;
  free_until: string | null;
  value_usd_month: number;
  score: number;
  verified: boolean;
  source: string;
  tags: string[];
}

async function scrapeHNDeals(): Promise<LiveDeal[]> {
  const deals: LiveDeal[] = [];
  try {
    const res = await fetch("https://hn.algolia.com/api/v1/search?query=free+AI+tool&tags=story&hitsPerPage=15&numericFilters=created_at_i>" + Math.floor((Date.now() - 7 * 86400000) / 1000));
    if (!res.ok) return deals;
    const data: any = await res.json();
    for (const hit of data.hits || []) {
      if (!hit.title || !hit.url) continue;
      const title = hit.title;
      const url = hit.url;
      if (/free|open.?source|alternative|self.?host/i.test(title)) {
        deals.push({
          name: title.slice(0, 80),
          slug: `hn-${hit.objectID}`,
          url,
          description: title.slice(0, 200),
          category: "AI / HN",
          deal_type: /open.?source|self.?host/i.test(title) ? "open_source" : "free_tier",
          deal_detail: `Discovered on Hacker News. ${hit.points || 0} points, ${hit.num_comments || 0} comments.`,
          free_until: null,
          value_usd_month: 0,
          score: Math.min(90, 60 + (hit.points || 0)),
          verified: false,
          source: "hackernews",
          tags: ["hackernews", "community"],
        });
      }
    }
  } catch {}
  return deals;
}

async function scrapeRedditDeals(): Promise<LiveDeal[]> {
  const deals: LiveDeal[] = [];
  const subs = ["LocalLLaMA", "AI_Agents", "OpenSource", "SaaS"];
  for (const sub of subs) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/search.json?q=free+tool&sort=new&t=week&limit=10`, {
        headers: { "User-Agent": "FreeIntel/1.0" }
      });
      if (!res.ok) continue;
      const data: any = await res.json();
      for (const child of (data?.data?.children || []).slice(0, 5)) {
        const d = child.data;
        if (!d.title) continue;
        const link = d.url_overridden_by_dest || d.url || `https://reddit.com${d.permalink}`;
        if (/free|open.?source|alternative|self.?host/i.test(d.title)) {
          deals.push({
            name: d.title.slice(0, 80),
            slug: `reddit-${d.id}`,
            url: link,
            description: (d.selftext || d.title).slice(0, 200),
            category: "AI / Reddit",
            deal_type: /open.?source|self.?host/i.test(d.title) ? "open_source" : "free_tier",
            deal_detail: `r/${sub}. ${d.score || 0} upvotes, ${d.num_comments || 0} comments.`,
            free_until: null,
            value_usd_month: 0,
            score: Math.min(85, 55 + (d.score || 0) / 10),
            verified: false,
            source: `reddit:r/${sub}`,
            tags: ["reddit", sub.toLowerCase()],
          });
        }
      }
    } catch {}
  }
  return deals;
}

async function scrapeProductHuntDeals(): Promise<LiveDeal[]> {
  const deals: LiveDeal[] = [];
  try {
    const res = await fetch("https://www.producthunt.com/feed?category=ai", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return deals;
    const html = await res.text();
    const linkRe = /<a[^>]+href="(\/posts\/[^"]+)"[^>]*>([^<]{5,100})<\/a>/gi;
    let m: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((m = linkRe.exec(html)) && deals.length < 10) {
      const slug = m[1];
      const title = m[2].trim();
      if (seen.has(slug)) continue;
      seen.add(slug);
      if (/free|open.?source|alternative/i.test(title)) {
        deals.push({
          name: title,
          slug: `ph-${slug.replace(/[^a-z0-9]+/g, "-")}`,
          url: `https://www.producthunt.com${slug}`,
          description: `Product Hunt: ${title}`,
          category: "AI / Product Hunt",
          deal_type: "free_tier",
          deal_detail: "Discovered on Product Hunt.",
          free_until: null,
          value_usd_month: 0,
          score: 70,
          verified: false,
          source: "producthunt",
          tags: ["producthunt", "launch"],
        });
      }
    }
  } catch {}
  return deals;
}

async function scrapeGitHubTrending(): Promise<LiveDeal[]> {
  const deals: LiveDeal[] = [];
  try {
    const res = await fetch("https://api.github.com/search/repositories?q=free+ai+tool+stars:>100&sort=stars&order=desc&per_page=15", {
      headers: { "Accept": "application/vnd.github+json", "User-Agent": "FreeIntel/1.0" },
    });
    if (!res.ok) return deals;
    const data: any = await res.json();
    for (const repo of data.items || []) {
      const topics: string[] = repo.topics || [];
      const desc = (repo.description || "").toLowerCase();
      if (/free|open.?source|self.?host|alternative/i.test(`${repo.name} ${desc} ${topics.join(" ")}`)) {
        const spdx = repo.license?.spdx_id;
        deals.push({
          name: repo.name,
          slug: `gh-${repo.full_name.replace(/[^a-z0-9]+/g, "-")}`,
          url: repo.html_url,
          description: (repo.description || "").slice(0, 200),
          category: "AI / GitHub",
          deal_type: spdx && spdx !== "NOASSERTION" ? "open_source" : "free_tier",
          deal_detail: `${repo.stargazers_count} stars. License: ${spdx || "unknown"}. Last push: ${String(repo.pushed_at || "").slice(0, 10)}.`,
          free_until: null,
          value_usd_month: 0,
          score: Math.min(95, 70 + Math.log10(repo.stargazers_count + 1) * 5),
          verified: false,
          source: "github",
          tags: ["github", "open-source"],
        });
      }
    }
  } catch {}
  return deals;
}

async function scrapeAIToolDirectories(): Promise<LiveDeal[]> {
  const deals: LiveDeal[] = [];
  const dirs = [
    { url: "https://theresanaiforthat.com/", name: "TheresAnAIForThat" },
    { url: "https://www.futuretools.io/", name: "FutureTools" },
  ];
  for (const dir of dirs) {
    try {
      const res = await fetch(dir.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const html = await res.text();
      const linkRe = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([^<]{5,80})<\/a>/gi;
      let m: RegExpExecArray | null;
      const seen = new Set<string>();
      while ((m = linkRe.exec(html)) && deals.length < 8) {
        const url = m[1];
        const title = m[2].trim();
        if (seen.has(url) || url.includes(dir.url)) continue;
        seen.add(url);
        if (/free|open.?source|alternative|agent|llm|mcp/i.test(title)) {
          deals.push({
            name: title,
            slug: `dir-${dir.name.toLowerCase()}-${dealSlug(title)}`,
            url,
            description: `Discovered from ${dir.name} directory.`,
            category: "AI / Directory",
            deal_type: "free_tier",
            deal_detail: `Found in ${dir.name} AI directory.`,
            free_until: null,
            value_usd_month: 0,
            score: 65,
            verified: false,
            source: `directory:${dir.name}`,
            tags: ["directory", dir.name.toLowerCase()],
          });
        }
      }
    } catch {}
  }
  return deals;
}

function dealSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
}

dealsApp.get("/deals", async (c) => {
  const { type, category, q } = c.req.query();

  const allDeals: Deal[] = [...DEALS_SEED];

  const [hnDeals, redditDeals, phDeals, ghDeals, dirDeals] = await Promise.allSettled([
    scrapeHNDeals(),
    scrapeRedditDeals(),
    scrapeProductHuntDeals(),
    scrapeGitHubTrending(),
    scrapeAIToolDirectories(),
  ]);

  for (const result of [hnDeals, redditDeals, phDeals, ghDeals, dirDeals]) {
    if (result.status === "fulfilled") allDeals.push(...result.value);
  }

  let filtered = allDeals;

  if (type && type !== "all") {
    filtered = filtered.filter((d) => d.deal_type === type);
  }
  if (category && category !== "all") {
    filtered = filtered.filter((d) => d.category.toLowerCase().includes(category.toLowerCase()));
  }
  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter((d) =>
      d.name.toLowerCase().includes(lower) ||
      d.description.toLowerCase().includes(lower) ||
      d.tags.some((t) => t.includes(lower))
    );
  }

  filtered.sort((a, b) => b.score - a.score);

  const stats = {
    total: filtered.length,
    free_tier: filtered.filter((d) => d.deal_type === "free_tier").length,
    limited_promotion: filtered.filter((d) => d.deal_type === "limited_promotion").length,
    open_source: filtered.filter((d) => d.deal_type === "open_source").length,
    free_credits: filtered.filter((d) => d.deal_type === "free_credits").length,
  };

  return c.json({
    deals: filtered.slice(0, 200),
    stats,
    live_sources: {
      hackernews: hnDeals.status === "fulfilled" ? hnDeals.value.length : 0,
      reddit: redditDeals.status === "fulfilled" ? redditDeals.value.length : 0,
      producthunt: phDeals.status === "fulfilled" ? phDeals.value.length : 0,
      github: ghDeals.status === "fulfilled" ? ghDeals.value.length : 0,
      directories: dirDeals.status === "fulfilled" ? dirDeals.value.length : 0,
    },
  });
});

dealsApp.get("/deals/live", async (c) => {
  const [hnDeals, redditDeals, phDeals, ghDeals] = await Promise.allSettled([
    scrapeHNDeals(),
    scrapeRedditDeals(),
    scrapeProductHuntDeals(),
    scrapeGitHubTrending(),
  ]);

  const live = [
    ...(hnDeals.status === "fulfilled" ? hnDeals.value : []),
    ...(redditDeals.status === "fulfilled" ? redditDeals.value : []),
    ...(phDeals.status === "fulfilled" ? phDeals.value : []),
    ...(ghDeals.status === "fulfilled" ? ghDeals.value : []),
  ];

  live.sort((a, b) => b.score - a.score);

  return c.json({ deals: live.slice(0, 50) });
});

export { dealsApp };
