import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, RefreshCw, Hourglass, Database, Radio, GitMerge, Play } from "lucide-react";
import { api } from "@/lib/api";
import { Panel, SectionTitle, Spinner } from "@/components/ui/primitives";
import { sfx } from "@/lib/sound";

export default function Admin() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [scanning, setScanning] = useState(false);

  const load = useCallback(() => {
    api.adminOverview().then(setData).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const runScan = async (_kind: string = "batch") => {
    setScanning(true);
    try {
      const res: any = await api.scanRun("batch");
      setToast(res.message || "SCAN COMPLETE");
      sfx.success();
    } catch (e: any) {
      setToast(`SCAN FAILED: ${String(e.message || e)}`);
      sfx.warn();
    } finally {
      setScanning(false);
      setTimeout(() => setToast(""), 3200);
      load();
    }
  };

  const act = async (fn: () => Promise<any>, id: string) => {
    setBusy(id);
    try {
      await fn();
      sfx.verify();
      setToast("ACTION APPLIED");
      setTimeout(() => setToast(""), 1600);
      load();
    } catch (e: any) {
      setToast(`FAILED: ${String(e.message || e)}`);
      sfx.warn();
      setTimeout(() => setToast(""), 2400);
    } finally {
      setBusy("");
    }
  };

  if (!data) return <Spinner label="Loading operations console" />;

  const statusMap: Record<string, number> = {};
  for (const s of data.status_counts || []) statusMap[s.s] = s.n;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 glass-bright rounded px-4 py-3 font-mono text-xs text-lime-neon shadow-glow-cyan">
          {toast}
        </div>
      )}

      <SectionTitle
        kicker="OPERATIONS CONSOLE // INTERNAL"
        title={<>SYSTEM HEALTH<span className="text-slate-600"> // </span><span className="grad-text">PIPELINE CONTROL</span></>}
        right={
          <div className="flex gap-2">
            <button onClick={() => runScan()} disabled={scanning} className="btn-neon !py-2 !px-4 text-[11px] disabled:opacity-50">
              <Play size={12} /> {scanning ? "CRAWLING…" : "RUN CRAWL BATCH"}
            </button>
            <button onClick={load} className="btn-ghost"><RefreshCw size={12} /> REFRESH</button>
          </div>
        }
      />

      {/* STATUS TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
        {["verified", "needs_review", "unverified", "discovered", "expired", "monitored", "published"].map((s) => (
          <Panel key={s} className={`p-3 ${s === "expired" ? "border-red-neon/20" : ""}`}>
            <div className="font-mono text-xl font-bold text-slate-100">{statusMap[s] ?? 0}</div>
            <div className="mono-label mt-0.5 truncate">{s.replace(/_/g, " ")}</div>
          </Panel>
        ))}
      </div>

      {/* SOURCE HEALTH */}
      <div className="mb-10">
        <div className="mono-label mb-3 flex items-center gap-2"><Radio size={12} /> SOURCE REGISTRY HEALTH</div>
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[760px] font-mono text-[11px]">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-500 uppercase tracking-[0.18em] text-[9px]">
                <th className="px-4 py-2.5 text-left">SOURCE</th>
                <th className="px-4 py-2.5">TIER</th>
                <th className="px-4 py-2.5">FREQ</th>
                <th className="px-4 py-2.5">LAST CHECKED</th>
                <th className="px-4 py-2.5">RELIABILITY</th>
                <th className="px-4 py-2.5">ERRORS</th>
                <th className="px-4 py-2.5">STATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {(data.sources || []).map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-800/20">
                  <td className="px-4 py-2 text-left">
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-slate-200 hover:text-cyan">{s.name}</a>
                    <span className="text-slate-600 ml-2 uppercase">{s.type}</span>
                  </td>
                  <td className="px-4 py-2 text-center text-purple-300">T{s.tier}</td>
                  <td className="px-4 py-2 text-center text-slate-400">{s.frequency_hours}h</td>
                  <td className="px-4 py-2 text-center text-amber-neon">{s.last_checked ? String(s.last_checked).slice(0, 16) : "NEVER"}</td>
                  <td className="px-4 py-2 text-center text-slate-300">{s.reliability}%</td>
                  <td className={`px-4 py-2 text-center ${s.error_count > 0 ? "text-red-neon" : "text-slate-500"}`}>{s.error_count}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() =>
                        act(async () => {
                          await fetch(`/api/admin/sources/${s.id}/toggle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
                        }, `src-${s.id}`)
                      }
                      disabled={busy === `src-${s.id}`}
                      className={`chip cursor-pointer transition-colors ${
                        s.active ? "border-lime-neon/40 text-lime-neon hover:bg-lime-neon/10" : "border-red-neon/40 text-red-neon hover:bg-red-neon/10"
                      }`}
                    >
                      {s.active ? "ACTIVE" : "DISABLED"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {/* SUBMISSION QUEUE */}
        <div>
          <div className="mono-label mb-3 flex items-center gap-2"><Hourglass size={12} /> USER SUBMISSION QUEUE ({(data.submissions || []).length})</div>
          {(data.submissions || []).length === 0 ? (
            <Panel className="p-6 text-center text-xs text-slate-500 font-mono">QUEUE EMPTY</Panel>
          ) : (
            <div className="space-y-2">
              {(data.submissions || []).map((s: any) => (
                <Panel key={s.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-sm text-slate-200 hover:text-cyan break-all max-w-[320px]">{s.name || s.url}</a>
                    <span className={`chip ml-auto ${
                      s.status === "approved" ? "border-lime-neon/40 text-lime-neon" :
                      s.status === "rejected" ? "border-red-neon/40 text-red-neon" : "border-amber-neon/40 text-amber-neon"
                    }`}>{String(s.status).toUpperCase()}</span>
                  </div>
                  {s.description && <p className="text-xs text-slate-500 line-clamp-2 mb-1">{s.description}</p>}
                  <div className="font-mono text-[9px] tracking-wider text-slate-600 mb-2">{String(s.analysis_notes).slice(0, 140)}</div>
                  {s.status !== "approved" && s.status !== "rejected" && (
                    <div className="flex gap-2">
                      <button disabled={busy === `sub-${s.id}`}
                        onClick={() => act(() => api.adminSubmissionAction(s.id, "approve"), `sub-${s.id}`)}
                        className="chip border-lime-neon/40 text-lime-neon hover:bg-lime-neon/10 cursor-pointer transition-colors">
                        <CheckCircle2 size={10} /> APPROVE → NEEDS_REVIEW STUB
                      </button>
                      <button disabled={busy === `sub-${s.id}`}
                        onClick={() => act(() => api.adminSubmissionAction(s.id, "reject"), `sub-${s.id}`)}
                        className="chip border-red-neon/40 text-red-neon hover:bg-red-neon/10 cursor-pointer transition-colors">
                        <XCircle size={10} /> REJECT
                      </button>
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* LOW CONFIDENCE */}
          <div>
            <div className="mono-label mb-3">LOW-CONFIDENCE RECORDS (NEEDS EVIDENCE)</div>
            <Panel className="divide-y divide-slate-800/40 max-h-64 overflow-y-auto">
              {(data.low_confidence || []).map((r: any) => (
                <div key={r.slug} className="flex items-center gap-3 px-4 py-2.5 font-mono text-[11px]">
                  <Link to={`/resource/${r.slug}`} className="text-slate-200 hover:text-cyan truncate">{r.name}</Link>
                  <span className="ml-auto chip border-amber-neon/30 text-amber-neon">{r.confidence_score}%</span>
                  <button onClick={() => act(() => api.adminResourceAction(r.slug, "autoverify"), `a-${r.slug}`)}
                    disabled={busy === `a-${r.slug}`}
                    className="chip border-cyan/40 text-cyan hover:bg-cyan/10 cursor-pointer transition-colors shrink-0">
                    AUTO-VERIFY
                  </button>
                  <button onClick={() => act(() => api.adminResourceAction(r.slug, "expire"), `x-${r.slug}`)}
                    disabled={busy === `x-${r.slug}`}
                    className="chip border-red-neon/40 text-red-neon hover:bg-red-neon/10 cursor-pointer transition-colors shrink-0">
                    EXPIRE
                  </button>
                </div>
              ))}
              {!(data.low_confidence || []).length && <div className="px-4 py-4 text-center text-slate-500">NONE — ALL CLEAR</div>}
            </Panel>
          </div>

          {/* DUPLICATES */}
          <div>
            <div className="mono-label mb-3 flex items-center gap-2"><GitMerge size={12} /> POSSIBLE DUPLICATES</div>
            <Panel className="p-4">
              {(data.duplicates || []).length ? (
                (data.duplicates as any[]).map((d) => (
                  <div key={d.norm} className="font-mono text-[11px] text-slate-400 py-1 border-b border-slate-800/40 last:border-0">
                    “{d.norm}” ×{d.n} — <span className="text-slate-500">{d.slugs}</span> <span className="text-amber-neon">MERGE TOOL PENDING</span>
                  </div>
                ))
              ) : (
                <div className="font-mono text-[11px] text-slate-500 text-center py-2">NO DUPLICATE NAMES DETECTED</div>
              )}
            </Panel>
          </div>

          {/* SCAN LOG + DB */}
          <div>
            <div className="mono-label mb-3 flex items-center gap-2"><Database size={12} /> SCHEDULED JOBS / SCAN LOG</div>
            <Panel className="p-4 font-mono text-[11px] space-y-1.5">
              {(data.recent_scans || []).map((s: any) => (
                <div key={s.id} className="flex gap-3 text-slate-400">
                  <span className={s.status === "complete" ? "text-lime-neon" : "text-amber-neon"}>{String(s.kind).toUpperCase()}/{String(s.status).toUpperCase()}</span>
                  <span className="tabular-nums text-slate-600">{(s.finished_at || s.started_at || "").slice(0, 19)}</span>
                  {!!s.discovered && <span className="text-cyan">+{s.discovered}</span>}
                </div>
              ))}
              {!(data.recent_scans || []).length && <div className="text-slate-500">NO SCANS YET</div>}
              <div className="pt-2 mt-2 border-t border-slate-800/50 text-slate-600 tracking-widest text-[9px] uppercase">
                Crawl queue: {(data.crawl_queue || []).map((q: any) => `${q.status}:${q.n}`).join(" · ") || "empty"}
              </div>
              <div className="text-slate-600 tracking-widest text-[9px] uppercase">
                Hourly cron via Cloudflare Workers triggers + GitHub Actions fallback
              </div>
            </Panel>
            {(data.recent_task_errors || []).length > 0 && (
              <Panel className="p-4 font-mono text-[11px] space-y-1 border-red-neon/20">
                <div className="mono-label mb-1 text-red-neon">RECENT TASK ERRORS</div>
                {(data.recent_task_errors as any[]).map((t, i) => (
                  <div key={i} className="text-red-neon/80 truncate">{t.kind}: {String(t.last_error).slice(0, 90)}</div>
                ))}
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
