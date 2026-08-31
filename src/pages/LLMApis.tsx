import { useEffect, useState } from "react";
import { ExternalLink, Zap, Shield, CreditCard, Clock, Filter } from "lucide-react";
import { Panel, SectionTitle, Spinner } from "@/components/ui/primitives";
import { sfx } from "@/lib/sound";

interface LLMProvider {
  id: string;
  name: string;
  website: string;
  api_endpoint: string;
  auth_type: string;
  free_tier: boolean;
  credit_card_required: boolean;
  rate_limit_rpm: number | null;
  rate_limit_rpd: number | null;
  rate_limit_tpm: number | null;
  tokens_per_day: number | null;
  models: string[];
  openai_compatible: boolean;
  notes: string;
  category: "permanent" | "trial-credits" | "usage-based";
  last_checked: string;
}

export default function LLMApis() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [stats, setStats] = useState({ total: 0, permanent_free: 0, trial_only: 0, no_card_required: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    fetch(`/api/llm-providers?category=${filter}`)
      .then(r => r.json() as Promise<{ providers: LLMProvider[]; stats: typeof stats }>)
      .then(d => {
        setProviders(d.providers || []);
        setStats(d.stats || stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  const sorted = [...providers].sort((a, b) => {
    if (sort === "rpm") return (b.rate_limit_rpm || 0) - (a.rate_limit_rpm || 0);
    if (sort === "rpd") return (b.rate_limit_rpd || 0) - (a.rate_limit_rpd || 0);
    if (sort === "tpd") return (b.tokens_per_day || 0) - (a.tokens_per_day || 0);
    if (sort === "models") return b.models.length - a.models.length;
    return a.name.localeCompare(b.name);
  });

  function freshness(ts: string) {
    const hrs = Math.round((Date.now() - new Date(ts).getTime()) / 3600000);
    if (hrs < 1) return "just now";
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <SectionTitle
        kicker="FREE LLM API ACCESS"
        title={<>COMPARISON TABLE<span className="text-slate-600"> // </span><span className="grad-text">$0 BUDGET</span></>}
      />

      <Panel className="p-4 mb-6" bright>
        <p className="text-sm text-slate-400 leading-relaxed">
          Every provider listed offers genuine free-tier API access with no credit card required.
          Data is refreshed automatically every 6 hours. Rates and limits verified at last check.
        </p>
      </Panel>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "TOTAL PROVIDERS", value: stats.total, color: "text-slate-100" },
          { label: "PERMANENT FREE", value: stats.permanent_free, color: "text-lime-neon" },
          { label: "TRIAL CREDITS ONLY", value: stats.trial_only, color: "text-amber-neon" },
          { label: "NO CARD REQUIRED", value: stats.no_card_required, color: "text-cyan" },
        ].map(s => (
          <Panel key={s.label} className="p-3 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mono-label mt-0.5">{s.label}</div>
          </Panel>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          ["all", "ALL"],
          ["permanent", "PERMANENT FREE"],
          ["trial-credits", "TRIAL CREDITS"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => { setFilter(v); sfx.click(); }}
            className={`chip cursor-pointer transition-colors ${
              filter === v ? "border-cyan text-cyan bg-cyan/10" : "border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {l}
          </button>
        ))}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="ml-auto bg-panel border border-slate-700 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-300 outline-none focus:border-cyan cursor-pointer"
        >
          <option value="name">SORT: NAME</option>
          <option value="rpm">SORT: RPM</option>
          <option value="rpd">SORT: RPD</option>
          <option value="tpd">SORT: TOKENS/DAY</option>
          <option value="models">SORT: # MODELS</option>
        </select>
        <span className="font-mono text-[10px] tracking-widest text-slate-500">
          {loading ? "LOADING…" : `${sorted.length} PROVIDER(S)`}
        </span>
      </div>

      {loading ? (
        <Spinner label="Loading LLM provider data…" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="font-mono text-[9px] tracking-widest text-slate-500 py-2 px-2">PROVIDER</th>
                <th className="font-mono text-[9px] tracking-widest text-slate-500 py-2 px-2">FREE TIER</th>
                <th className="font-mono text-[9px] tracking-widest text-slate-500 py-2 px-2">RPM</th>
                <th className="font-mono text-[9px] tracking-widest text-slate-500 py-2 px-2">RPD</th>
                <th className="font-mono text-[9px] tracking-widest text-slate-500 py-2 px-2">TPM</th>
                <th className="font-mono text-[9px] tracking-widest text-slate-500 py-2 px-2">MODELS</th>
                <th className="font-mono text-[9px] tracking-widest text-slate-500 py-2 px-2">CARD?</th>
                <th className="font-mono text-[9px] tracking-widest text-slate-500 py-2 px-2">CHECKED</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                  <td className="py-3 px-2">
                    <a href={p.website} target="_blank" rel="noreferrer" className="text-sm text-cyan hover:underline font-medium">
                      {p.name}
                    </a>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">{p.api_endpoint}</div>
                  </td>
                  <td className="py-3 px-2">
                    {p.free_tier ? (
                      <span className="chip border-lime-neon/40 text-lime-neon text-[8px]">
                        <Zap size={8} className="inline mr-0.5" /> FREE
                      </span>
                    ) : (
                      <span className="chip border-amber-neon/40 text-amber-neon text-[8px]">TRIAL</span>
                    )}
                  </td>
                  <td className="py-3 px-2 font-mono text-xs text-slate-300">{p.rate_limit_rpm ?? "—"}</td>
                  <td className="py-3 px-2 font-mono text-xs text-slate-300">{p.rate_limit_rpd?.toLocaleString() ?? "—"}</td>
                  <td className="py-3 px-2 font-mono text-xs text-slate-300">{p.rate_limit_tpm?.toLocaleString() ?? "—"}</td>
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-0.5 max-w-[200px]">
                      {p.models.slice(0, 3).map(m => (
                        <span key={m} className="text-[8px] font-mono bg-slate-800/60 text-slate-400 px-1 py-0.5 rounded">{m}</span>
                      ))}
                      {p.models.length > 3 && (
                        <span className="text-[8px] font-mono text-slate-600">+{p.models.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    {p.credit_card_required ? (
                      <CreditCard size={12} className="text-amber-neon" />
                    ) : (
                      <Shield size={12} className="text-lime-neon" />
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <span className="font-mono text-[9px] text-slate-500 flex items-center gap-1">
                      <Clock size={8} />
                      {freshness(p.last_checked)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes section */}
      <Panel className="p-4 mt-8">
        <div className="mono-label mb-3">PROVIDER NOTES</div>
        <div className="space-y-2">
          {sorted.filter(p => p.notes).map(p => (
            <div key={p.id} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="font-mono text-cyan shrink-0">{p.name}:</span>
              <span>{p.notes}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
