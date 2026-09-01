import { useEffect, useState } from "react";
import { ExternalLink, Download, Heart, Shield, Cpu, ArrowUpDown } from "lucide-react";
import { Panel, SectionTitle, Spinner } from "@/components/ui/primitives";
import { sfx } from "@/lib/sound";

interface OpenWeightModel {
  id: string;
  author: string;
  model_id: string;
  downloads: number;
  likes: number;
  trending_score: number | null;
  pipeline_tag: string | null;
  license: string | null;
  tags: string[];
  last_modified: string;
  gated: boolean;
  hosted_free: string[];
  self_host_note: string;
}

export default function OpenWeightModels() {
  const [models, setModels] = useState<OpenWeightModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [licenseFilter, setLicenseFilter] = useState("all");
  const [sort, setSort] = useState("trending");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/open-weight-models?limit=50${licenseFilter !== "all" ? `&license=${licenseFilter}` : ""}`)
      .then(r => r.json() as Promise<{ models: OpenWeightModel[] }>)
      .then(d => { setModels(d.models || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [licenseFilter]);

  const sorted = [...models].sort((a, b) => {
    if (sort === "downloads") return b.downloads - a.downloads;
    if (sort === "likes") return b.likes - a.likes;
    if (sort === "name") return a.model_id.localeCompare(b.model_id);
    return (b.trending_score || 0) - (a.trending_score || 0);
  });

  function fmtNum(n: number) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  function freshness(ts: string) {
    if (!ts) return "unknown";
    const d = new Date(ts);
    const days = Math.round((Date.now() - d.getTime()) / 86400000);
    if (days < 1) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    return `${Math.round(days / 30)}mo ago`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <SectionTitle
        kicker="OPEN-WEIGHT MODELS"
        title={<>TRENDING MODELS<span className="text-slate-600"> // </span><span className="grad-text">HUGGINGFACE LIVE</span></>}
      />

      <Panel className="p-3 md:p-4 mb-4 md:mb-6" bright>
        <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
          Trending open-weight models from HuggingFace. Only models with permissive licenses
          (MIT, Apache, etc.) are highlighted. Refreshed every 12 hours.
        </p>
      </Panel>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-4 md:mb-6">
        {[
          ["all", "ALL"],
          ["apache", "APACHE"],
          ["mit", "MIT"],
          ["llama", "LLAMA"],
          ["gemma", "GEMMA"],
          ["qwen", "QWEN"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => { setLicenseFilter(v); sfx.click(); }}
            className={`chip cursor-pointer transition-colors ${
              licenseFilter === v ? "border-cyan text-cyan bg-cyan/10" : "border-slate-700 text-slate-400 hover:text-slate-200"
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
          <option value="trending">SORT: TRENDING</option>
          <option value="downloads">SORT: DOWNLOADS</option>
          <option value="likes">SORT: LIKES</option>
          <option value="name">SORT: NAME</option>
        </select>
        <span className="font-mono text-[10px] tracking-widest text-slate-500">
          {loading ? "SCANNING…" : `${sorted.length} MODEL(S)`}
        </span>
      </div>

      {loading ? (
        <Spinner label="Fetching trending models from HuggingFace…" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(m => (
            <Panel key={m.id} className="p-4 hover:border-slate-600/60 transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <a
                    href={`https://huggingface.co/${m.model_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sm text-slate-100 hover:text-cyan transition-colors truncate block"
                  >
                    {m.model_id}
                  </a>
                  <div className="font-mono text-[9px] text-slate-500 mt-0.5">by {m.author}</div>
                </div>
                {m.gated && (
                  <span className="chip border-amber-neon/40 text-amber-neon text-[7px] shrink-0">GATED</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {m.license && (
                  <span className="chip border-cyan/40 text-cyan text-[8px]">
                    <Shield size={8} className="inline mr-0.5" />
                    {(m.license || "unknown").toUpperCase()}
                  </span>
                )}
                {m.pipeline_tag && (
                  <span className="chip border-slate-600/40 text-slate-400 text-[8px]">
                    {m.pipeline_tag}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 mb-3">
                <span className="flex items-center gap-1"><Download size={10} /> {fmtNum(m.downloads)}</span>
                <span className="flex items-center gap-1"><Heart size={10} /> {fmtNum(m.likes)}</span>
                {m.trending_score != null && (
                  <span className="flex items-center gap-1"><ArrowUpDown size={10} /> {m.trending_score}</span>
                )}
              </div>

              {m.hosted_free.length > 0 && (
                <div className="text-[9px] text-lime-neon/70 font-mono mb-1">
                  <Cpu size={8} className="inline mr-0.5" />
                  Free hosted: {m.hosted_free.join(", ")}
                </div>
              )}

              <div className="text-[9px] text-slate-500 font-mono">
                {m.self_host_note}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[8px] text-slate-600">
                  Updated: {freshness(m.last_modified)}
                </span>
                <a
                  href={`https://huggingface.co/${m.model_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[9px] text-cyan/70 hover:text-cyan flex items-center gap-0.5"
                >
                  VIEW <ExternalLink size={8} />
                </a>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
