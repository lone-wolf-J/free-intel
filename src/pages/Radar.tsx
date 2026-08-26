import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Satellite, RefreshCw, Play, User, Clock, Zap, ArrowUpRight, ExternalLink, Github } from "lucide-react";
import { sfx } from "@/lib/sound";
import { api, type RadarEvent, type RadarStatus } from "@/lib/api";
import { Panel } from "@/components/ui/primitives";

const TYPE_COLOR: Record<string, string> = {
  discovery: "text-violet-neon",
  verification: "text-lime-neon",
  expiration: "text-red-neon",
  promotion: "text-amber-neon",
  submission: "text-cyan",
  system: "text-slate-500"
};

const INTERESTS = [
  ["AI", ["AI", "OCR"]],
  ["Coding", ["Developer tools"]],
  ["MCP", ["MCP"]],
  ["Cloud", ["Hosting", "Infrastructure"]],
  ["Automation", ["Automation"]],
  ["Databases", ["Databases"]],
  ["Design", ["Design"]],
  ["Productivity", ["Productivity"]]
] as const;

export default function Radar() {
  const [events, setEvents] = useState<RadarEvent[]>([]);
  const [status, setStatus] = useState<RadarStatus | null>(null);
  const [filter, setFilter] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [dailyCounts, setDailyCounts] = useState<{ type: string; n: number }[]>([]);
  const [newToday, setNewToday] = useState<any[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<any[]>([]);

  useEffect(() => {
    try { setInterests(JSON.parse(localStorage.getItem("fi-interests") || "[]")); } catch {}
    const load = () => {
      api.radarEvents(60).then((e) => setEvents(e.events)).catch(() => {});
      api.radarStatus().then(setStatus).catch(() => {});
      api.daily().then((d) => {
        setDailyCounts(d.event_counts || []);
        setNewToday(d.new_resources || []);
        setExpiringSoon(d.expiring_soon || []);
      }).catch(() => {});
    };
    load();
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, []);

  const toggleInterest = (k: string) => {
    setInterests((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      try { localStorage.setItem("fi-interests", JSON.stringify(next)); } catch {}
      return next;
    });
    import("@/lib/sound").then((m) => m.sfx.click());
  };

  const myCats = useMemo(
    () => new Set(interests.flatMap((k) => (INTERESTS.find(([n]) => n === k)?.[1] as readonly string[]) || [])),
    [interests]
  );
  const forYou = useMemo(() => newToday.filter((r) => myCats.size === 0 || myCats.has(r.category)), [newToday, myCats]);

  const runScan = async () => {
    setScanning(true); setScanMsg("");
    try {
      const res = await api.scanRun("batch");
      setScanMsg(res.message + (res.errors.length ? ` (${res.errors.length} error(s): ${res.errors[0]})` : ""));
      const evs = await api.radarEvents(60); setEvents(evs.events);
      setStatus(await api.radarStatus());
      sfx.success();
    } catch (e: any) {
      setScanMsg(`SCAN FAILED: ${String(e.message || e)}`);
      sfx.warn();
    } finally { setScanning(false); }
  };

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);
  const types = ["all", ...Array.from(new Set(events.map((e) => e.type)))];
  const countOf = (t: string) => dailyCounts.find((d) => d.type === t)?.n ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="flex items-center gap-3 mb-2">
        <Satellite size={18} className="text-cyan" />
        <span className="mono-label">FREE RADAR // CONTINUOUS DISCOVERY FEED</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">
        <span className="grad-text">EVERY SIGNAL.</span> <span className="text-slate-100">ZERO NOISE.</span>
      </h1>

      {/* TODAY'S INTELLIGENCE */}
      <Panel bright className="p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="mono-label flex items-center gap-2"><Clock size={12} /> TODAY'S FREE INTELLIGENCE // LAST 24H</div>
          <div className="flex gap-2">
            <button onClick={runScan} disabled={scanning}
              className="btn-neon !py-2 !px-4 text-[11px] disabled:opacity-50 inline-flex items-center gap-2">
              <Play size={12} /> {scanning ? "SCANNING…" : "RUN FULL SCAN"}
            </button>
            <button onClick={runScan} disabled={scanning}
              className="btn-ghost disabled:opacity-50">
              <RefreshCw size={12} /> VERIFY QUEUE
            </button>
          </div>
        </div>
        {scanMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-4 font-mono text-[11px] leading-relaxed text-cyan bg-cyan/5 border border-cyan/20 rounded p-3">
            {scanMsg}
          </motion.div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center mb-4">
          {[
            ["DISCOVERIES", countOf("discovery")],
            ["VERIFICATIONS", countOf("verification")],
            ["PRICING CHANGES", countOf("promotion")],
            ["EXPIRATIONS", countOf("expiration")],
            ["NEW RESOURCES", newToday.length]
          ].map(([label, v]) => (
            <div key={String(label)} className="bg-void/50 border border-slate-800 rounded p-3">
              <div className="font-mono text-xl font-bold text-slate-100">{v}</div>
              <div className="mono-label mt-1">{label}</div>
            </div>
          ))}
        </div>
        {forYou.length > 0 && (
          <div className="border-t border-slate-800/60 pt-3">
            <div className="font-mono text-[11px] tracking-wider text-slate-400 mb-2">
              <User size={11} className="inline mr-1.5 -mt-0.5 text-lime-neon" />
              {myCats.size ? `${forYou.length} NEW FOR YOUR INTERESTS` : `${newToday.length} NEW OPPORTUNITIES`}
              {expiringSoon.length > 0 && (
                <span className="text-amber-neon ml-2">· {expiringSoon.length} EXPIRING WITHIN 14 DAYS</span>
              )}
            </div>
          </div>
        )}
        {expiringSoon.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {expiringSoon.slice(0, 5).map((x) => (
              <Link key={x.slug} to={`/resource/${x.slug}`} className="chip border-red-neon/40 text-red-neon hover:bg-red-neon/10 transition-colors">
                {x.name} · FREE UNTIL {String(x.expires_at).slice(0, 10)}
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {/* NEW RESOURCES — brief descriptions */}
      {newToday.length > 0 && (
        <Panel className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} className="text-lime-neon" />
            <span className="mono-label">NEWLY DISCOVERED TODAY</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {newToday.slice(0, 8).map((r: any, i: number) => (
              <motion.div
                key={r.slug || i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-void/40 border border-slate-800 hover:border-slate-600/60 rounded p-3 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] tracking-widest text-slate-600">
                      {(r.category || "UNCATEGORIZED").toUpperCase()}
                    </div>
                    <Link to={`/resource/${r.slug}`} className="block text-sm font-semibold text-slate-100 group-hover:text-cyan transition-colors truncate">
                      {r.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="w-8 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${(r.free_score || 0) >= 80 ? "bg-lime-neon" : (r.free_score || 0) >= 60 ? "bg-cyan" : "bg-amber-neon"}`}
                        style={{ width: `${r.free_score || 0}%` }}
                      />
                    </div>
                    <span className="font-mono text-[8px] text-slate-600">{r.free_score || 0}</span>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2 mb-2">
                  {r.description || "Free resource discovered by the pipeline."}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`chip text-[8px] ${r.verification_status === "verified" ? "border-lime-neon/40 text-lime-neon" : "border-slate-700 text-slate-500"}`}>
                    {String(r.origin || "unknown").toUpperCase()}
                  </span>
                  <Link
                    to={`/resource/${r.slug}`}
                    className="font-mono text-[9px] text-cyan/70 hover:text-cyan flex items-center gap-0.5 transition-colors"
                  >
                    VIEW <ArrowUpRight size={8} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </Panel>
      )}

      {/* STATUS STRIP */}
      <Panel className="p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {[
            ["RESOURCES", status?.resources?.total],
            ["VERIFIED", status?.resources?.verified],
            ["UNVERIFIED", status?.resources?.unverified],
            ["GITHUB-SOURCED", status?.resources?.github],
            ["EVENTS / 24H", status?.events_24h]
          ].map(([label, v]) => (
            <div key={String(label)}>
              <div className="font-mono text-xl md:text-2xl font-bold text-slate-100">{v ?? "—"}</div>
              <div className="mono-label mt-1">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/60 font-mono text-[10px] tracking-widest text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            {status?.last_scan
              ? `LAST BATCH: ${status.last_scan.finished_at || status.last_scan.started_at} · +${status.last_scan.discovered ?? 0} DISCOVERED`
              : "NO SCANS EXECUTED YET — THIS PAGE SHOWS REAL PIPELINE ACTIVITY ONLY"}
          </span>
          {(status?.crawl_queue || []).map((q) => (
            <span key={q.status} className={`chip ${q.status === "pending" ? "border-cyan/40 text-cyan" : q.status === "error" ? "border-red-neon/40 text-red-neon" : "border-slate-700 text-slate-500"}`}>
              QUEUE {q.status}: {q.n}
            </span>
          ))}
        </div>
      </Panel>

      {/* PERSONALIZATION */}
      <div className="mb-6">
        <div className="mono-label mb-2">PERSONALIZE YOUR RADAR // STORED LOCALLY, NEVER UPLOADED</div>
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map(([name]) => (
            <button key={name} onClick={() => toggleInterest(name)}
              className={`chip cursor-pointer transition-colors ${
                interests.includes(name) ? "border-lime-neon/60 text-lime-neon bg-lime-neon/10" : "border-slate-700 text-slate-400 hover:text-slate-200"
              }`}>
              {String(name).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* EVENT FILTERS */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {types.map((t) => (
          <button key={t}
            onClick={() => setFilter(t)}
            className={`chip cursor-pointer transition-colors ${
              filter === t ? "border-cyan text-cyan bg-cyan/10" : "border-slate-700 text-slate-400 hover:text-slate-200"
            }`}>
            {t.replace(/_/g, " ").toUpperCase()}
          </button>
        ))}
      </div>

      <div className="relative pl-4 md:pl-6">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-neon/50 via-cyan/30 to-transparent" />
        {filtered.length === 0 && (
          <div className="glass rounded-lg p-8 text-center text-sm text-slate-500">
            No events of this type yet. The radar only logs real pipeline activity.
          </div>
        )}
        <AnimatePresence initial={false}>
          {filtered.map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="relative mb-3"
            >
              <span className={`absolute -left-4 md:-left-[22px] top-4 h-2.5 w-2.5 rounded-full border ${
                e.severity === "critical" ? "bg-red-neon border-red-neon" :
                e.severity === "warn" ? "bg-amber-neon border-amber-neon" :
                e.type === "discovery" ? "bg-violet-neon border-violet-neon" : "bg-cyan border-cyan"
              }`} style={{ boxShadow: "0 0 10px currentColor" }} />
              <Panel className={`p-4 hover:border-slate-600/40 transition-colors ${e.severity === "critical" ? "border-red-neon/25" : ""}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-[10px] tabular-nums text-slate-600">{(e.created_at || "").slice(0, 19)}</span>
                  <span className={`font-mono text-xs font-bold tracking-[0.14em] ${TYPE_COLOR[e.type] || "text-slate-300"}`}>
                    {e.title}
                  </span>
                  <span className="chip border-slate-700 text-slate-500 ml-auto">{String(e.type).toUpperCase()}</span>
                </div>
                {e.detail && <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{e.detail}</p>}
                {e.resource_slug && (
                  <Link to={`/resource/${e.resource_slug}`} className="mt-2 inline-flex font-mono text-[10px] tracking-widest text-cyan/80 hover:text-cyan">
                    OPEN DOSSIER →
                  </Link>
                )}
              </Panel>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

