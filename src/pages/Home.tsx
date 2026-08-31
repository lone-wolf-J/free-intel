import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Zap, Layers, Calculator, TerminalSquare, AlertTriangle, Filter } from "lucide-react";
import { api, type RadarEvent, type RadarStatus, type Resource } from "@/lib/api";
import { sfx } from "@/lib/sound";
import { Counter, TypeWriter, Panel, SectionTitle } from "@/components/ui/primitives";
import TiltCard from "@/components/ui/TiltCard";
import ResourceCard from "@/components/resource/ResourceCard";
import { StatusBadge } from "@/components/ui/badges";

const INTENT_CHIPS = [
  "Build an AI recruitment agent",
  "Replace Zapier",
  "Host a website for free",
  "Need a free OCR API",
  "Build an MCP server",
  "Replace expensive observability software"
];

export default function Home() {
  const [status, setStatus] = useState<RadarStatus | null>(null);
  const [events, setEvents] = useState<RadarEvent[]>([]);
  const [craziest, setCraziest] = useState<Resource | null>(null);
  const [overpaying, setOverpaying] = useState<Resource[]>([]);
  const [hiddenTier, setHiddenTier] = useState<Resource[]>([]);
  const reduced = useReducedMotion();
  const nav = useNavigate();

  useEffect(() => {
    let alive = true;
    api.radarStatus().then((s) => alive && setStatus(s)).catch(() => {});
    api.radarEvents(8).then((e) => alive && setEvents(e.events)).catch(() => {});
    api.resources({ sort: "score", limit: "1" }).then((r) => alive && setCraziest(r.items[0] || null)).catch(() => {});
    api.resources({ alt: "only", sort: "score", limit: "3" }).then((r) => alive && setOverpaying(r.items)).catch(() => {});
    api.resources({ free_type: "free_tier", limit: "3" }).then((r) => alive && setHiddenTier(r.items)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const stats = [
    { label: "RESOURCES TRACKED", value: status?.resources?.total ?? 0 },
    { label: "VERIFIED", value: status?.resources?.verified ?? 0 },
    { label: "AWAITING VERIFICATION", value: status?.resources?.unverified ?? 0 },
    { label: "SOURCES REGISTERED", value: status?.active_sources ?? 0 }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      {/* HERO */}
      <section className="pt-16 md:pt-24 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <span className="chip border-lime-neon/50 text-lime-neon bg-lime-neon/5">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-neon animate-pulse-dot" />
            SYSTEM STATUS: ACTIVE
          </span>
          <span className="hidden md:inline font-mono text-[10px] tracking-[0.2em] text-slate-500">
            FREE RESOURCE INTELLIGENCE PLATFORM
          </span>
        </motion.div>

        <h1 className="font-bold leading-[0.98] tracking-tight text-4xl sm:text-5xl md:text-7xl max-w-5xl">
          <span className="grad-text">STOP PAYING</span>
          <br />
          <span className="text-slate-100">FOR WHAT YOU CAN</span>
          <br />
          <span className="text-slate-100">
            GET FOR <span className="neon-text text-cyan">FREE.</span>
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-slate-400 min-h-[48px]">
          <TypeWriter text="AI models. APIs. MCP servers. Agent skills. Open-source software. Cloud credits. SaaS alternatives. Continuously discovered, verified, ranked and explained." />
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/discover" className="btn-neon" onClick={() => sfx.click()}>
            FIND FREE RESOURCES <ArrowRight size={14} />
          </Link>
          <Link to="/stacks" className="btn-neon btn-violet" onClick={() => sfx.click()}>
            <Layers size={14} /> BUILD A FREE STACK
          </Link>
          <Link to="/save-money" className="btn-ghost" onClick={() => sfx.click()}>
            <Calculator size={13} /> ANALYZE MY SOFTWARE COST
          </Link>
        </div>

        {/* INTENT ENTRY */}
        <div className="mt-12">
          <div className="mono-label mb-3">WHAT ARE YOU TRYING TO BUILD?</div>
          <div className="flex flex-wrap gap-2">
            {INTENT_CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => { sfx.discover(); nav(`/discover?q=${encodeURIComponent(c)}`); }}
                className="group flex items-center gap-2 rounded-full border border-slate-600/30 bg-panel/60 px-4 py-2 text-xs text-slate-300 hover:border-cyan/50 hover:text-cyan transition-all duration-200 cursor-pointer"
              >
                <Zap size={11} className="text-slate-500 group-hover:text-cyan transition-colors" />
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* COUNTERS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
        {stats.map((s, i) => (
          <Panel key={s.label} className="p-4 md:p-5" bright={i === 0}>
            <div className="text-2xl md:text-3xl font-bold text-slate-100">
              <Counter value={s.value} />
            </div>
            <div className="mono-label mt-1">{s.label}</div>
          </Panel>
        ))}
      </section>

      {/* LIVE RADAR */}
      <section className="grid lg:grid-cols-5 gap-6 mb-20">
        <div className="lg:col-span-3">
          <Panel className="overflow-hidden h-full" bright>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/40">
              <div className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-cyan">
                <TerminalSquare size={15} />
                LIVE FREE RADAR
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-lime-neon animate-pulse-dot" />
                <span className="font-mono text-[9px] tracking-widest text-lime-neon">LISTENING</span>
              </div>
            </div>

            {status?.last_scan ? (
              <div className="px-5 py-2 border-b border-slate-800/60 bg-slate-900/40 font-mono text-[10px] tracking-wider text-slate-500">
                LAST COMPLETED SCAN: {String(status.last_scan.kind).toUpperCase()} @{" "}
                {status.last_scan.finished_at || status.last_scan.started_at} · STATUS:{" "}
                <span className={status.last_scan.status === "complete" ? "text-lime-neon" : "text-red-neon"}>
                  {String(status.last_scan.status).toUpperCase()}
                </span>{" "}
                · NOT SCANNING RIGHT NOW — NO FAKE REALTIME
              </div>
            ) : (
              <div className="px-5 py-2 border-b border-slate-800/60 bg-slate-900/40 font-mono text-[10px] tracking-wider text-amber-neon">
                NO SCAN DATA YET — RUN A GITHUB SCAN FROM THE RADAR PAGE
              </div>
            )}

            <div className="p-4 md:p-5 space-y-1 min-h-[240px] font-mono text-[11px] md:text-xs">
              {events.length === 0 && (
                <div className="text-slate-500 py-8 text-center tracking-widest">
                  AWAITING FIRST INTELLIGENCE EVENT…
                  <span className="animate-blink text-cyan">▊</span>
                </div>
              )}
              {events.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduced ? 0 : i * 0.08, duration: 0.35 }}
                  className="flex items-start gap-3 py-1 group"
                >
                  <span className="text-slate-600 shrink-0 tabular-nums">
                    {(e.created_at || "").slice(11, 19)}
                  </span>
                  <span
                    className={`shrink-0 ${
                      e.severity === "critical"
                        ? "text-red-neon"
                        : e.severity === "warn"
                        ? "text-amber-neon"
                        : e.type === "discovery"
                        ? "text-violet-neon"
                        : "text-cyan"
                    }`}
                  >
                    {e.type === "discovery" ? "◆" : e.severity !== "info" ? "▲" : "·"}
                  </span>
                  <span className="tracking-wider text-slate-300 group-hover:text-white transition-colors">
                    <span className={e.type === "system" ? "text-slate-500" : ""}>{e.title}</span>
                    {e.detail && (
                      <span className="block text-slate-500 mt-0.5 leading-relaxed normal-case tracking-normal">
                        {e.detail.length > 110 ? e.detail.slice(0, 110) + "…" : e.detail}
                      </span>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="px-5 pb-4">
              <Link to="/radar" className="btn-ghost w-full justify-center">
                OPEN FULL RADAR
              </Link>
            </div>
          </Panel>
        </div>

        {/* CRAZIEST FIND */}
        <div className="lg:col-span-2">
          <SectionTitle kicker="RETENTION MODULE // REAL DATA ONLY" title="TODAY'S CRAZIEST FIND" />
          {craziest ? (
            <TiltCard className="p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-violet-deep/30 blur-3xl pointer-events-none" />
              <div className="mono-label mb-3 text-violet-300">HIGHEST FREE SCORE IN DATABASE</div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    to={`/resource/${craziest.slug}`}
                    className="text-xl font-bold text-slate-100 hover:text-cyan transition-colors"
                  >
                    {craziest.name}
                  </Link>
                  <div className="mt-1"><StatusBadge status={craziest.verification_status} /></div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-4xl font-bold grad-text leading-none">
                    <Counter value={craziest.free_score} />
                  </div>
                  <div className="mono-label mt-1">FREE SCORE</div>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-400 leading-relaxed">{craziest.description}</p>
              <Link to={`/resource/${craziest.slug}`} className="btn-neon mt-5">
                OPEN DOSSIER <ArrowRight size={13} />
              </Link>
            </TiltCard>
          ) : (
            <Panel className="p-6 text-sm text-slate-500">Loading intelligence…</Panel>
          )}

          <div className="mt-4 glass rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle size={15} className="text-amber-neon shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-slate-500">
              <span className="font-mono text-amber-neon">DATA POLICY:</span> every resource on this
              platform was discovered by live crawls of real sources (GitHub API, RSS feeds, official
              pages). Unknown facts display as UNKNOWN — never guessed. Empty sections mean the
              engine hasn't verified qualifying data yet.
            </p>
          </div>
        </div>
      </section>

      {/* RETENTION ROWS — rendered only when real data exists */}
      {overpaying.length > 0 && (
        <section className="mb-20">
          <SectionTitle
            kicker="YOU ARE PROBABLY OVERPAYING FOR THIS"
            title="Tools with declared free alternatives in the database"
            right={<Link to="/save-money" className="btn-ghost">RUN COST ANALYSIS</Link>}
          />
          <div className="grid md:grid-cols-3 gap-4">
            {overpaying.map((r, i) => (
              <ResourceCard key={r.id} r={r} index={i} />
            ))}
          </div>
        </section>
      )}

      {hiddenTier.length > 0 && (
        <section className="mb-20">
          <SectionTitle
            kicker="HIDDEN FREE TIER"
            title="Metered services with verified free allowances"
            right={<Link to="/discover?free_type=free_tier" className="btn-ghost">SEE ALL</Link>}
          />
          <div className="grid md:grid-cols-3 gap-4">
            {hiddenTier.map((r, i) => (
              <ResourceCard key={r.id} r={r} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* PHILOSOPHY STRIP */}
      <section className="mb-10">
        <Panel className="p-6 md:p-8 overflow-hidden relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="mono-label mb-2">BROWSE & FILTER</div>
              <p className="text-sm text-slate-400">Filter by category, classification, sort by score or recency.</p>
            </div>
            <Link to="/discover" className="btn-neon" onClick={() => sfx.click()}>
              <Filter size={13} className="mr-1" /> OPEN DISCOVER <ArrowRight size={13} />
            </Link>
          </div>
        </Panel>
      </section>

      {/* PHILOSOPHY STRIP */}
      <section className="mb-10">
        <Panel className="p-8 md:p-10 text-center overflow-hidden relative" bright>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/70 to-transparent" />
          <div className="font-mono text-[10px] tracking-[0.3em] text-slate-500 mb-4">
            THE LOOP
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-sm md:text-lg tracking-[0.14em]">
            {["DISCOVER", "VERIFY", "USE", "SAVE", "EXPLORE"].map((w, i) => (
              <span key={w} className="flex items-center gap-3">
                <span className={i % 2 ? "text-violet-neon violet-text" : "text-cyan neon-text"}>{w}</span>
                {i < 4 && <span className="text-slate-600">→</span>}
              </span>
            ))}
          </div>
          <p className="mt-5 max-w-xl mx-auto text-sm text-slate-400">
            Enter with <span className="text-slate-200">“I need something.”</span> Leave with
            “I found exactly what I needed, learned how to use it, and saved money.”
          </p>
        </Panel>
      </section>
    </div>
  );
}
