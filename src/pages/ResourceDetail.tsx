import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ExternalLink, Github, Layers, Share2, Flag,
  BadgeCheck, ShieldAlert, BookOpen, Terminal
} from "lucide-react";
import { api, type Resource as Res, type Evidence } from "@/lib/api";
import { sfx } from "@/lib/sound";
import { Panel } from "@/components/ui/primitives";
import { ScoreRing, ConfidenceBar, StatusBadge, FreeTypeChips, Pipeline, Unknown, scoreColor } from "@/components/ui/badges";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 md:gap-4 py-2 md:py-2.5 border-b border-slate-800/50 last:border-0">
      <span className="mono-label pt-0.5 shrink-0 text-[8px] md:text-[10px]">{label}</span>
      <span className="text-right text-[11px] md:text-[13px] text-slate-300 font-medium break-words min-w-0">{children}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4 }}
      className="glass rounded-lg p-5 md:p-6"
    >
      <h3 className="flex items-center gap-2 font-mono text-xs tracking-[0.22em] text-cyan mb-4">
        {icon}{title}
      </h3>
      {children}
    </motion.section>
  );
}

const YesNo = ({ v }: { v: string }) =>
  v === "yes" ? <span className="text-lime-neon font-mono text-xs">YES</span>
  : v === "no" ? <span className="text-red-neon font-mono text-xs">NO</span>
  : v === "partial" ? <span className="text-amber-neon font-mono text-xs">PARTIAL</span>
  : <Unknown />;

const METHOD_LABELS: Record<string, string> = {
  github_api: "GITHUB API",
  http: "HTTP FETCH",
  llm_extract: "LLM EXTRACTED",
  user_submission: "USER SUBMITTED"
};

export default function ResourceDetail() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<{ resource: Res; evidence: Evidence[]; alternatives: Res[] } | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setData(null); setErr("");
    api.resource(slug).then(setData).catch((e) => setErr(String(e.message || e)));
  }, [slug]);

  if (err) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16 md:py-28 text-center">
        <div className="font-mono text-red-neon mb-4">// SIGNAL LOST</div>
        <p className="text-sm text-slate-400 mb-6">Resource not found in the intelligence database.</p>
        <Link to="/discover" className="btn-neon"><ArrowLeft size={13} /> BACK TO DISCOVER</Link>
      </div>
    );
  }
  if (!data) {
    return <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-28 font-mono text-xs tracking-widest text-slate-500">LOADING DOSSIER…<span className="animate-blink text-cyan">▊</span></div>;
  }

  const r = data.resource;
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  const components = Object.entries(r.free_score_components || {});

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <Link to="/discover" className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-slate-500 hover:text-cyan transition-colors mb-6">
        <ArrowLeft size={12} /> DISCOVER
      </Link>

      {/* HEADER */}
      <Panel bright className="p-6 md:p-8 mb-6 overflow-hidden relative">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-cyan/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <StatusBadge status={r.verification_status} />
              <span className="chip border-slate-600/40 text-slate-400">{String(r.resource_type).toUpperCase()}</span>
              {r.category && <span className="chip border-violet-neon/30 text-purple-300">{String(r.category).toUpperCase()}</span>}
              {r.alt_kind && (
                <span className="chip border-violet-neon/40 text-purple-300">
                  {String(r.alt_kind).replace(/_/g, " ").toUpperCase()}{r.alt_of ? ` → ${String(r.alt_of).toUpperCase()}` : ""}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-100 leading-tight">
              {r.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm md:text-[15px] leading-relaxed text-slate-400">{r.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <FreeTypeChips types={r.free_types} />
            </div>
          </div>
          <div className="shrink-0 text-center">
            <ScoreRing score={r.free_score} size={92} />
            <div className="mono-label mt-1">FREE SCORE</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {r.url && (
            <a href={r.url} target="_blank" rel="noreferrer" className="btn-neon" onClick={() => sfx.success()}>
              USE THIS FOR FREE <ExternalLink size={13} />
            </a>
          )}
          <Link to="/stacks" className="btn-neon btn-violet"><Layers size={14} /> ADD TO MY STACK</Link>
          <button onClick={share} className="btn-ghost"><Share2 size={12} /> {copied ? "COPIED ✓" : "SHARE"}</button>
          <a href={`mailto:intel@free-intel.dev?subject=OUTDATED%3A%20${encodeURIComponent(r.slug)}`} className="btn-ghost hover:text-red-neon hover:border-red-neon/40">
            <Flag size={12} /> REPORT OUTDATED
          </a>
          {r.github_url && (
            <a href={r.github_url} target="_blank" rel="noreferrer" className="btn-ghost"><Github size={12} /> REPOSITORY</a>
          )}
        </div>
      </Panel>

      {/* PIPELINE + SCORE + EVIDENCE */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Section title="VERIFICATION PIPELINE" icon={<BadgeCheck size={13} />}>
          <Pipeline status={r.verification_status} />
          <div className="mt-4 flex items-center justify-between">
            <ConfidenceBar value={r.confidence_score} />
            <span className="font-mono text-[9px] tracking-widest text-slate-600 text-right">
              LAST VERIFIED:<br />{r.last_verified || "NEVER"}
            </span>
          </div>
        </Section>
        <Section title="SCORE BREAKDOWN" icon={<ShieldAlert size={13} />}>
          {components.length === 0 ? <Unknown>NOT YET SCORED</Unknown> : (
            <div className="space-y-2">
              {components.map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-28 mono-label truncate">{k.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, Math.abs(v) * 5)}%` }} viewport={{ once: true }}
                      transition={{ duration: 0.8 }} className="h-full rounded-full"
                      style={{ background: v >= 0 ? scoreColor(r.free_score) : "#ff4d5e" }} />
                  </div>
                  <span className="font-mono text-[11px] w-7 text-right" style={{ color: v >= 0 ? "#cbd5e1" : "#ff4d5e" }}>{v > 0 ? `+${v}` : v}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title={`SOURCE EVIDENCE // ${data.evidence.length}`} icon={<BookOpen size={13} />}>
          {!data.evidence.length ? (
            <div className="text-xs text-slate-500 leading-relaxed">
              <Unknown>NO EVIDENCE ON FILE.</Unknown>
              <br />This record has not been verified yet — every claim should be treated as unconfirmed.
            </div>
          ) : (
            <ul className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {data.evidence.map((e) => (
                <li key={e.id} className="border-l-2 border-cyan/40 pl-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[9px] tracking-widest text-violet-300">{METHOD_LABELS[e.method] || e.method.toUpperCase()}</span>
                    <span className="font-mono text-[9px] text-slate-600">CONF {e.confidence}% · {String(e.retrieved_at).slice(0, 16)}</span>
                  </div>
                  <div className="font-mono text-[11px] tracking-wide text-slate-300 mt-0.5">{e.claim}</div>
                  {e.evidence_text && <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">“{e.evidence_text}”</div>}
                  {e.source_url && (
                    <a href={e.source_url} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-cyan/80 hover:text-cyan break-all">{e.source_url}</a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* MAIN GRID */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Section title="WHAT YOU GET / WHO CAN USE IT">
          <Row label="FREE ALLOWANCE">{r.free_allowance ?? <Unknown />}</Row>
          <Row label="FREE LIMITS">{r.free_limits ?? <Unknown />}</Row>
          <Row label="PERSONAL USE"><YesNo v={r.personal_use} /></Row>
          <Row label="COMMERCIAL USE"><YesNo v={r.commercial_use} /></Row>
          <Row label="LICENSE">{r.license ? <span className="font-mono text-xs">{r.license}</span> : <Unknown />}</Row>
          <Row label="CARD REQUIRED"><YesNo v={r.card_required} /></Row>
        </Section>
        <Section title="COST REALITY">
          <Row label="SOFTWARE LICENSE">
            {r.license
              ? <span className="font-mono text-lime-neon">$0*</span>
              : <Unknown />}
            {" "}<span className="text-slate-500 text-xs">*per license terms above</span>
          </Row>
          <Row label="HOSTING / INFRA">
            {typeof r.infra_cost_month === "number"
              ? <span className="font-mono">~${r.infra_cost_month}/mo (stored estimate)</span>
              : <>{r.infrastructure_note || <Unknown />}{(r.infrastructure_note || r.self_hostable === "yes") && (
                  <span className="block text-slate-500 text-xs mt-1">Self-hosting is not automatically free — you pay in hosting or time.</span>
                )}</>}
          </Row>
          <Row label="EST. SAVING"><span className="text-slate-500 text-xs">Computed only on the Save Money page from your real spend.</span></Row>
          <Row label="EXPIRATION">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : <span className="font-mono text-xs text-slate-500">NO EXPIRY ON FILE</span>}</Row>
          <Row label="DIFFICULTY">{r.difficulty !== "unknown" ? String(r.difficulty).toUpperCase() : <Unknown />}</Row>
          <Row label="DISCOVERED">{r.first_discovered?.slice(0, 19) || <Unknown />}</Row>
        </Section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Section title="SETUP / USAGE / API" icon={<Terminal size={13} />}>
          {[["SETUP", null], ["USAGE", null]].map(([label]) => (
            <div key={label as string} className="mb-3">
              <div className="mono-label mb-1.5">{label}</div>
              <Unknown>PENDING AUTOMATED EXTRACTION</Unknown>
            </div>
          ))}
          {r.docs_url && (
            <a href={r.docs_url} target="_blank" rel="noreferrer" className="btn-ghost mt-2"><BookOpen size={12} /> OFFICIAL DOCUMENTATION</a>
          )}
        </Section>
        <Section title="ALTERNATIVES RELATIONSHIP MAP">
          <div className="mb-4">
            <div className="mono-label mb-1.5">REPLACES / ALTERNATIVE TO</div>
            {r.alt_of ? (
              <span className="chip border-violet-neon/40 text-purple-300">{String(r.alt_of).toUpperCase()}</span>
            ) : <Unknown>NOT DECLARED BY ANY SOURCE</Unknown>}
          </div>
          <div className="mb-4">
            <div className="mono-label mb-1.5">KNOWN ALTERNATIVES TO THIS RESOURCE</div>
            {data.alternatives.length ? (
              <div className="flex flex-wrap gap-2">
                {data.alternatives.map((a) => (
                  <Link key={a.slug} to={`/resource/${a.slug}`} className="chip border-violet-neon/40 text-purple-300 hover:bg-violet-neon/10 transition-colors">
                    {a.name} · {String(a.alt_kind || "alt").replace(/_/g, " ")}
                  </Link>
                ))}
              </div>
            ) : <Unknown>NONE DISCOVERED YET</Unknown>}
          </div>
          <div>
            <div className="mono-label mb-1.5">SECURITY NOTES</div>
            {r.security_notes || <span className="text-xs text-slate-500">No security review on file. Never execute repository code without reading it first.</span>}
          </div>
        </Section>
      </div>

      {/* META */}
      <Section title="METADATA" icon={<BookOpen size={13} />}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8">
          <Row label="ORIGIN">{String(r.origin).toUpperCase()}</Row>
          <Row label="FIRST SEEN">{r.first_discovered?.slice(0, 19) || <Unknown />}</Row>
          <Row label="POPULARITY">{typeof r.popularity === "number" ? `${r.popularity.toLocaleString()} stars` : <Unknown />}</Row>
          <Row label="LAST PUSH">{r.github_last_push?.slice(0, 10) || <Unknown />}</Row>
        </div>
        {!!r.tags.length && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.tags.map((t) => <span key={t} className="chip border-slate-700 text-slate-500">{t}</span>)}
          </div>
        )}
      </Section>
    </div>
  );
}
