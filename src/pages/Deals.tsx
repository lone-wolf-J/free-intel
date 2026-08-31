import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Flame, RefreshCw, ArrowRight, Globe, Github, MessageCircle, Search, SlidersHorizontal } from "lucide-react";
import { Panel, SectionTitle, Spinner } from "@/components/ui/primitives";
import { sfx } from "@/lib/sound";

interface Deal {
  name: string;
  slug: string;
  url: string;
  description: string;
  category: string;
  deal_type: "free_tier" | "limited_promotion" | "open_source" | "free_credits";
  deal_detail: string;
  free_until: string | null;
  value_usd_month: number;
  cost_note: string | null;
  parent_tool: string | null;
  score: number;
  verified: boolean;
  source: string;
  tags: string[];
}

interface DealsResponse {
  deals: Deal[];
  stats: {
    total: number;
    free_tier: number;
    limited_promotion: number;
    open_source: number;
    free_credits: number;
    total_value_month: number;
  };
  live_sources: {
    hackernews: number;
    reddit: number;
    producthunt: number;
    github: number;
    directories: number;
  };
}

const DEAL_CATEGORIES = [
  { key: "free_tier", label: "FREE TIERS", icon: "🆓", color: "lime" },
  { key: "limited_promotion", label: "LIMITED TIME", icon: "⏰", color: "red" },
  { key: "open_source", label: "OPEN SOURCE", icon: "🔓", color: "cyan" },
  { key: "free_credits", label: "FREE CREDITS", icon: "💰", color: "amber" },
] as const;

export default function Deals() {
  const [data, setData] = useState<DealsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("score");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("type", filter);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/deals?${params}`);
      const json = (await res.json()) as DealsResponse;
      setData(json);
      setLastRefresh(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const deals = data?.deals || [];
  const stats = data?.stats || { total: 0, free_tier: 0, limited_promotion: 0, open_source: 0, free_credits: 0 };
  const live = data?.live_sources || { hackernews: 0, reddit: 0, producthunt: 0, github: 0, directories: 0 };

  const filtered = (filter === "all" ? deals : deals.filter((d) => d.deal_type === filter)).sort((a, b) => {
    if (sort === "score") return b.score - a.score;
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "value") return ((b as any).value_usd_month || 0) - ((a as any).value_usd_month || 0);
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Flame size={18} className="text-red-neon" />
          <span className="mono-label">DEALS // PROMOTIONS // FREE TIERS</span>
        </div>
        <button
          onClick={() => { sfx.click(); fetchDeals(); }}
          disabled={loading}
          className="btn-ghost text-xs flex items-center gap-1"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> REFRESH
        </button>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
        <span className="text-slate-100">FREE — </span>
        <span className="text-red-neon" style={{ textShadow: "0 0 24px rgba(255,77,94,.4)" }}>BEFORE IT DISAPPEARS.</span>
      </h1>

      {/* Live source badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: "Hacker News", count: live.hackernews, icon: <MessageCircle size={10} /> },
          { label: "Reddit", count: live.reddit, icon: <MessageCircle size={10} /> },
          { label: "Product Hunt", count: live.producthunt, icon: <Globe size={10} /> },
          { label: "GitHub", count: live.github, icon: <Github size={10} /> },
          { label: "Directories", count: live.directories, icon: <Search size={10} /> },
        ].map((s) => (
          <span key={s.label} className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/40 font-mono text-[9px] text-slate-400">
            {s.icon} {s.label}: {s.count}
          </span>
        ))}
      </div>

      <Panel className="p-4 mb-6 flex items-start gap-3">
        <Clock size={15} className="text-amber-neon shrink-0 mt-0.5" />
        <div>
          <p className="text-xs leading-relaxed text-slate-400">
            Live intelligence from {stats.total} verified free tiers, limited promotions,
            open-source alternatives, and free credits. Scraped from HN, Reddit, Product Hunt,
            GitHub, and {Object.values(live).reduce((a, b) => a + b, 0)} live sources.
          </p>
          {lastRefresh && (
            <p className="font-mono text-[9px] text-slate-600 mt-1">
              LAST REFRESH: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
      </Panel>

      {/* Search */}
      <div className="mb-4">
        <div className="flex items-center gap-2 bg-panel border border-slate-700 rounded px-3 py-2">
          <Search size={14} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchDeals()}
            placeholder="Search deals: 'free llm', 'crm', 'hosting', 'pdf tool'..."
            className="w-full bg-transparent outline-none text-sm text-slate-200 placeholder:text-slate-600 font-mono"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`chip cursor-pointer transition-colors ${
            filter === "all" ? "border-cyan text-cyan bg-cyan/10" : "border-slate-700 text-slate-400 hover:text-slate-200"
          }`}
        >
          ALL ({stats.total})
        </button>
        {DEAL_CATEGORIES.map((cat) => {
          const count = stats[cat.key as keyof typeof stats] || 0;
          return (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`chip cursor-pointer transition-colors ${
                filter === cat.key ? "border-cyan text-cyan bg-cyan/10" : "border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
        <div className="ml-auto">
          <select
            value={sort} onChange={(e) => { setSort(e.target.value); sfx.click(); }}
            aria-label="Sort deals"
            className="bg-panel border border-slate-700 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-300 outline-none focus:border-cyan cursor-pointer"
          >
            <option value="score">SORT: SCORE</option>
            <option value="name">SORT: NAME</option>
            <option value="value">SORT: COMPETITIVE VALUE</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Spinner label="Scraping live deal sources..." />
      ) : filtered.length === 0 ? (
        <Panel className="p-10 text-center">
          <p className="font-mono text-xs text-slate-500 tracking-widest">NO DEALS MATCH YOUR FILTER</p>
          <p className="text-xs text-slate-600 mt-2">Try a different filter or search term.</p>
        </Panel>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((deal, i) => (
            <motion.div
              key={(deal as any).slug || deal.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <DealCard deal={deal} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats breakdown */}
      {data && (
        <Panel className="p-4 mt-8">
          <div className="mono-label mb-3">DEAL BREAKDOWN</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DEAL_CATEGORIES.map((cat) => {
              const count = stats[cat.key as keyof typeof stats] || 0;
              const catDeals = deals.filter((d) => d.deal_type === cat.key);
              const avgScore = catDeals.reduce((a, b) => a + b.score, 0) / (count || 1);
              return (
                <div key={cat.key} className="text-center p-3 bg-void/40 rounded border border-slate-800">
                  <div className="text-lg">{cat.icon}</div>
                  <div className="font-mono text-xs text-slate-300 mt-1">{count}</div>
                  <div className="font-mono text-[9px] text-slate-600">{cat.label}</div>
                  {count > 0 && (
                    <div className="font-mono text-[9px] text-cyan mt-1">AVG SCORE: {Math.round(avgScore)}</div>
                  )}
                </div>
              );
            })}
          </div>
          {((stats as any).total_value_month || 0) > 0 && (
            <div className="mt-3 text-center font-mono text-[10px] text-lime-neon">
              TOTAL COMPETITIVE VALUE: ${(stats as any).total_value_month}/mo (from verified pricing sources)
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const typeColor = {
    free_tier: "border-lime-neon/40 text-lime-neon",
    limited_promotion: "border-red-neon/40 text-red-neon",
    open_source: "border-cyan/40 text-cyan",
    free_credits: "border-amber-neon/40 text-amber-neon",
  }[deal.deal_type] || "border-slate-600 text-slate-400";

  const typeLabel = {
    free_tier: "FREE TIER",
    limited_promotion: "LIMITED TIME",
    open_source: "OPEN SOURCE",
    free_credits: "FREE CREDITS",
  }[deal.deal_type] || deal.deal_type;

  const sourceIcon = (deal.source || "").startsWith("github") ? <Github size={9} /> :
    (deal.source || "").startsWith("reddit") ? <MessageCircle size={9} /> :
    (deal.source || "").startsWith("hackernews") ? <MessageCircle size={9} /> :
    (deal.source || "").startsWith("producthunt") ? <Globe size={9} /> :
    <Globe size={9} />;

  return (
    <a
      href={deal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-panel border border-slate-800 hover:border-slate-600/60 rounded-lg p-4 transition-all hover:shadow-lg hover:shadow-cyan/5 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-slate-100 group-hover:text-cyan transition-colors truncate">
            {deal.name}
          </h3>
          <div className="font-mono text-[9px] tracking-widest text-slate-600 mt-0.5">
            {deal.category.toUpperCase()}
          </div>
        </div>
        <span className={`chip text-[8px] shrink-0 ${typeColor}`}>{typeLabel}</span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-2">
        {deal.description}
      </p>

      {(deal as any).deal_detail && (
        <div className="text-[9px] text-slate-500 font-mono mb-3 bg-slate-900/50 rounded px-2 py-1.5 line-clamp-2">
          {(deal as any).deal_detail}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${deal.score >= 80 ? "bg-lime-neon" : deal.score >= 60 ? "bg-cyan" : "bg-amber-neon"}`}
                style={{ width: `${deal.score}%` }}
              />
            </div>
            <span className="font-mono text-[9px] text-slate-600">{deal.score}</span>
          </div>
          {(deal as any).value_usd_month > 0 && (deal as any).cost_note && (
            <span className="font-mono text-[9px] text-lime-neon" title={`Competing paid product: ${(deal as any).cost_note}`}>
              vs. {(deal as any).parent_tool}: {(deal as any).cost_note}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 font-mono text-[9px] text-slate-500 group-hover:text-cyan transition-colors">
          {sourceIcon} VIEW DEAL <ArrowRight size={9} />
        </div>
      </div>
    </a>
  );
}
