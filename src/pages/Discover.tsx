import { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import { api, type Resource } from "@/lib/api";
import ResourceCard from "@/components/resource/ResourceCard";
import { EmptyState, Spinner, SectionTitle, Panel } from "@/components/ui/primitives";
import { sfx } from "@/lib/sound";

const QUICK = [
  "free coding agent",
  "I need OCR",
  "Build an AI recruiter",
  "Replace Zapier",
  "Free database for an AI agent",
  "Need an MCP server for GitHub",
  "free llm api",
  "self-hosted crm",
  "free email marketing",
  "open source analytics"
];

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "all");
  const [freeType, setFreeType] = useState(params.get("free_type") || "all");
  const [sort, setSort] = useState("score");
  const [items, setItems] = useState<Resource[]>([]);
  const [facets, setFacets] = useState<{ categories: any[]; types: any[] }>({ categories: [], types: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [aiTerms, setAiTerms] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<"ai" | "basic">("ai");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    setAiTerms([]);
    try {
      if (q.trim() && searchMode === "ai") {
        // Use AI-powered search
        const res = await api.aiSearch(q.trim());
        setItems(res.items);
        setAiTerms(res.expanded_terms || []);
      } else {
        // Use basic filtered search
        const p: Record<string, string> = { sort };
        if (q.trim()) p.q = q.trim();
        if (category !== "all") p.category = category;
        if (freeType !== "all") p.free_type = freeType;
        const res = await api.resources(p);
        setItems(res.items);
      }
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [q, category, freeType, sort, searchMode]);

  // Debounced search for AI mode
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load();
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [load]);

  useEffect(() => {
    api.facets().then(setFacets).catch(() => {});
  }, []);

  useEffect(() => {
    const next: Record<string, string> = {};
    if (q.trim()) next.q = q.trim();
    if (category !== "all") next.category = category;
    if (freeType !== "all") next.free_type = freeType;
    setParams(next, { replace: true });
  }, [q, category, freeType]);

  const FREE_TYPES = [
    ["open_source", "OPEN SOURCE"], ["self_hosted", "SELF-HOSTED"],
    ["free_forever", "FREE FOREVER*"], ["free_tier", "FREE TIER"],
    ["free_credits", "FREE CREDITS"], ["limited_promotion", "LIMITED OFFER"]
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <SectionTitle
        kicker="DISCOVERY ENGINE"
        title={<>FIND FREE RESOURCES<span className="text-slate-600"> // </span><span className="grad-text">AI-POWERED SEARCH</span></>}
      />

      <Panel className="p-4 mb-6" bright>
        <div className="flex items-center gap-3">
          {searchMode === "ai" ? (
            <Sparkles size={17} className="text-cyan shrink-0" />
          ) : (
            <Search size={17} className="text-cyan shrink-0" />
          )}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder={searchMode === "ai"
              ? 'AI search: "free coding agent" · "self-hosted CRM" · "open source analytics"'
              : 'Search: "OCR" · "database" · "Zapier alternative"'}
            aria-label="Search resources"
            className="w-full bg-transparent outline-none text-sm text-slate-200 placeholder:text-slate-600 font-mono"
          />
          <button
            onClick={() => setSearchMode(searchMode === "ai" ? "basic" : "ai")}
            className={`shrink-0 px-2 py-1 rounded font-mono text-[9px] tracking-widest transition-colors ${
              searchMode === "ai"
                ? "bg-cyan/10 text-cyan border border-cyan/30"
                : "bg-slate-800 text-slate-500 border border-slate-700"
            }`}
          >
            {searchMode === "ai" ? "AI" : "BASIC"}
          </button>
          {(q || category !== "all" || freeType !== "all") && (
            <button
              onClick={() => { setQ(""); setCategory("all"); setFreeType("all"); sfx.click(); }}
              className="font-mono text-[10px] tracking-widest text-slate-500 hover:text-red-neon transition-colors shrink-0"
            >
              RESET
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK.map((s) => (
            <button
              key={s}
              onClick={() => { setQ(s); setSearchMode("ai"); sfx.discover(); }}
              className="chip border-slate-600/40 text-slate-400 hover:border-cyan/50 hover:text-cyan transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
        {aiTerms.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="font-mono text-[9px] text-slate-600 self-center mr-1">EXPANDED:</span>
            {aiTerms.slice(0, 12).map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded bg-cyan/5 text-cyan/60 font-mono text-[9px]">
                {t}
              </span>
            ))}
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-8">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => { setCategory("all"); sfx.click(); }}
            className={`chip cursor-pointer transition-colors ${category === "all" ? "border-cyan text-cyan bg-cyan/10" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}>
            ALL ({facets.categories.reduce((a, b) => a + b.n, 0)})
          </button>
          {facets.categories.map((f) => (
            <button key={f.category} onClick={() => { setCategory(f.category); setSearchMode("basic"); sfx.click(); }}
              className={`chip cursor-pointer transition-colors ${category === f.category ? "border-cyan text-cyan bg-cyan/10" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}>
              {String(f.category).toUpperCase()} ({f.n})
            </button>
          ))}
        </div>
        <select
          value={freeType} onChange={(e) => { setFreeType(e.target.value); setSearchMode("basic"); }}
          aria-label="Filter by free classification"
          className="bg-panel border border-slate-700 rounded px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-300 outline-none focus:border-cyan"
        >
          <option value="all">ALL CLASSIFICATIONS</option>
          {FREE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          value={sort} onChange={(e) => setSort(e.target.value)}
          aria-label="Sort results"
          className="bg-panel border border-slate-700 rounded px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-300 outline-none focus:border-cyan"
        >
          <option value="score">SORT: FREE SCORE</option>
          <option value="confidence">SORT: CONFIDENCE</option>
          <option value="newest">SORT: NEWEST</option>
          <option value="popular">SORT: POPULARITY</option>
          <option value="name">SORT: NAME</option>
        </select>
        <span className="ml-auto font-mono text-[10px] tracking-widest text-slate-500">
          {loading ? "SCANNING…" : `${items.length} RESULT(S)`}
        </span>
      </div>

      {err && (
        <Panel className="p-4 mb-6 border-red-neon/30">
          <span className="font-mono text-xs text-red-neon">QUERY FAILED: {err}</span>
        </Panel>
      )}

      {loading ? (
        <Spinner label={searchMode === "ai" ? "AI analyzing your search intent" : "Querying intelligence database"} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No matches in the current knowledge base."
          hint="Try different keywords or run a GitHub scan from the Radar page to discover more resources."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((r, i) => <ResourceCard key={r.id} r={r} index={i} />)}
        </div>
      )}
    </div>
  );
}
