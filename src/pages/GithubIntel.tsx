import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, Play, AlertTriangle } from "lucide-react";
import { api, type Resource, type Scan } from "@/lib/api";
import { Panel, SectionTitle, Spinner, EmptyState } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/badges";

const PRESET_QUERIES = [
  ["mcp server", "MCP SERVERS"],
  ["ai agent framework", "AGENT FRAMEWORKS"],
  ["ocr", "OCR ENGINES"],
  ["vector database", "VECTOR DATABASES"],
  ["workflow automation self-hosted", "AUTOMATION"],
  ["uptime monitoring", "MONITORING"]
];

export default function GithubIntel() {
  const [query, setQuery] = useState("mcp server");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string>("");
  const [repos, setRepos] = useState<Resource[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [error, setError] = useState("");

  const loadRepos = () => {
    api.resources({ origin: "github", limit: "60", sort: "popular" })
      .then((r) => setRepos(r.items)).catch(() => {});
    api.adminOverview().then((o: any) => setScans(o.recent_scans || [])).catch(() => {});
  };
  useEffect(loadRepos, []);

  const runScan = async (q: string) => {
    setQuery(q);
    setScanning(true); setError(""); setResult("");
    try {
      const res: any = await api.githubScan(q);
      setResult(res.message || `Scanned ${res.scanned} repositories.`);
      loadRepos();
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="flex items-center gap-3 mb-2">
        <Github size={18} className="text-violet-neon" />
        <span className="mono-label">GITHUB INTELLIGENCE // FIRST-CLASS DATA SOURCE</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">
        <span className="text-slate-100">THE LARGEST </span>
        <span className="grad-text">FREE RESOURCE MINE</span>
        <span className="text-slate-100"> ON EARTH.</span>
      </h1>

      <Panel bright className="p-5 mb-8">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !scanning && runScan(query)}
            placeholder="GitHub search query e.g. mcp server"
            aria-label="GitHub search query"
            className="flex-1 bg-void/70 border border-slate-700 focus:border-cyan rounded px-4 py-3 text-sm font-mono outline-none transition-colors placeholder:text-slate-600"
          />
          <button onClick={() => runScan(query)} disabled={scanning} className="btn-neon btn-violet justify-center disabled:opacity-50">
            <Play size={13} /> {scanning ? "SCANNING…" : "RUN LIVE SCAN"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESET_QUERIES.map(([q, label]) => (
            <button key={q} onClick={() => !scanning && runScan(q)} disabled={scanning}
              className="chip border-slate-600/40 text-slate-400 hover:border-violet-neon/60 hover:text-purple-300 transition-colors cursor-pointer disabled:opacity-50">
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 font-mono text-[10px] tracking-wider text-slate-600 leading-relaxed">
          LIVE CALL TO api.github.com SEARCH (FREE, UNAUTHENTICATED: RATE-LIMITED). REPOSITORIES ENTER AS
          â€œDISCOVERED" WITH REAL STARS/LICENSE/PUSH DATA CAPTURED AT SCAN TIME — NEVER RANKED BY STARS ALONE,
          NEVER AUTO-PROMOTED.
        </p>
        {scanning && <Spinner label="Contacting GitHub · ingesting repositories" />}
        {result && !scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 font-mono text-xs text-lime-neon bg-lime-neon/5 border border-lime-neon/20 rounded p-3 leading-relaxed">
            âœ“ {result}
          </motion.div>
        )}
        {error && !scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 flex items-start gap-2 font-mono text-xs text-red-neon bg-red-neon/5 border border-red-neon/20 rounded p-3 leading-relaxed">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}
      </Panel>

      {/* SCAN LOG */}
      {scans.length > 0 && (
        <div className="mb-10">
          <div className="mono-label mb-3">RECENT SCAN LOG</div>
          <Panel className="divide-y divide-slate-800/50">
            {scans.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 font-mono text-[11px]">
                <span className={`chip ${s.status === "complete" ? "border-lime-neon/40 text-lime-neon" : s.status === "failed" ? "border-red-neon/40 text-red-neon" : "border-amber-neon/40 text-amber-neon"}`}>
                  {String(s.status).toUpperCase()}
                </span>
                <span className="tracking-widest text-slate-300">{String(s.kind).toUpperCase()}</span>
                <span className="text-slate-600 ml-auto tabular-nums">{(s.finished_at || s.started_at || "").slice(0, 19)}</span>
                {!!s.discovered && <span className="text-cyan">+{s.discovered} NEW</span>}
              </div>
            ))}
          </Panel>
        </div>
      )}

      {/* INGESTED REPOS */}
      <SectionTitle
        kicker={`INGESTED REPOSITORIES // ${repos.length} ON FILE`}
        title="GitHub-sourced resources (real stats at scan time)"
        right={<Link to="/discover?origin=github" className="btn-ghost">OPEN IN DISCOVER</Link>}
      />
      {repos.length === 0 ? (
        <EmptyState
          title="No GitHub ingestion has run yet."
          hint="Run a live scan above to pull real repository data straight from the GitHub API into the intelligence database."
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-slate-700/50 font-mono text-[9px] tracking-[0.2em] text-slate-500 uppercase">
                <th className="px-4 py-3">Repository</th>
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3 text-right">Stars*</th>
                <th className="px-4 py-3 text-right">Last Push*</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs divide-y divide-slate-800/40">
              {repos.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link to={`/resource/${r.slug}`} className="text-slate-200 hover:text-cyan">{r.name}</Link>
                    <div className="text-[10px] text-slate-600 truncate max-w-[280px]">{r.github_url}</div>
                  </td>
                  <td className="px-4 py-2.5 text-purple-300">{r.license || "UNKNOWN"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">{typeof r.popularity === "number" ? r.popularity.toLocaleString() : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">{r.github_last_push?.slice(0, 10) || "—"}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={r.verification_status} /></td>
                  <td className="px-4 py-2.5 text-right font-bold text-lime-neon">{r.free_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 font-mono text-[9px] tracking-widest text-slate-600 border-t border-slate-800/50">
            * CAPTURED AT SCAN TIME — HISTORICAL SNAPSHOT, NOT LIVE VALUES
          </div>
        </Panel>
      )}
    </div>
  );
}

