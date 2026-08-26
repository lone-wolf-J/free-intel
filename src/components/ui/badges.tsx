import { motion } from "framer-motion";
import type { Resource } from "@/lib/api";
import { PIPELINE } from "@/lib/api";

const STATUS_STYLE: Record<string, { cls: string; label: string }> = {
  verified: { cls: "border-lime-neon/40 text-lime-neon bg-lime-neon/10", label: "VERIFIED" },
  published: { cls: "border-lime-neon/40 text-lime-neon bg-lime-neon/10", label: "PUBLISHED" },
  monitored: { cls: "border-cyan/40 text-cyan bg-cyan/10", label: "MONITORED" },
  discovered: { cls: "border-violet-neon/40 text-purple-300 bg-violet-neon/10", label: "DISCOVERED" },
  analyzing: { cls: "border-amber-neon/40 text-amber-300 bg-amber-neon/10", label: "ANALYZING" },
  classified: { cls: "border-amber-neon/40 text-amber-300 bg-amber-neon/10", label: "CLASSIFIED" },
  unverified: { cls: "border-slate-500/40 text-slate-400 bg-slate-500/10", label: "UNVERIFIED" },
  needs_review: { cls: "border-amber-neon/40 text-amber-300 bg-amber-neon/5", label: "NEEDS REVIEW" },
  expired: { cls: "border-red-neon/50 text-red-neon bg-red-neon/10", label: "EXPIRED" },
  suspended: { cls: "border-red-neon/40 text-red-neon bg-red-neon/5", label: "SUSPENDED" }
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.unverified;
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
}

const FREE_TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  open_source: { label: "OPEN SOURCE", cls: "border-lime-neon/35 text-lime-neon" },
  self_hosted: { label: "SELF-HOSTABLE", cls: "border-violet-neon/35 text-purple-300" },
  free_forever: { label: "FREE FOREVER*", cls: "border-cyan/35 text-cyan" },
  free_tier: { label: "FREE TIER", cls: "border-cyan/35 text-cyan" },
  free_credits: { label: "FREE CREDITS", cls: "border-amber-neon/35 text-amber-300" },
  limited_promotion: { label: "LIMITED OFFER", cls: "border-red-neon/40 text-red-neon" },
  cheap_alternative: { label: "CHEAP ALT", cls: "border-slate-500/40 text-slate-400" }
};

export function FreeTypeChips({ types }: { types: string[] }) {
  if (!types?.length) {
    return <span className="chip border-slate-600/40 text-slate-500">UNKNOWN</span>;
  }
  return (
    <>
      {types.map((t) => {
        const m = FREE_TYPE_LABELS[t];
        return m ? (
          <span key={t} className={`chip ${m.cls}`}>{m.label}</span>
        ) : (
          <span key={t} className="chip border-slate-500/30 text-slate-400">{t.replace(/_/g, " ")}</span>
        );
      })}
    </>
  );
}

export function scoreColor(score: number) {
  if (score >= 75) return "#a3ff12";
  if (score >= 50) return "#00f0ff";
  if (score >= 25) return "#ffb454";
  return "#ff4d5e";
}

export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,140,200,0.15)" strokeWidth="3" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: circ - (score / 100) * circ }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold text-sm leading-none" style={{ color }}>{score}</span>
        <span className="font-mono text-[7px] tracking-[0.2em] text-slate-500 mt-0.5">SCORE</span>
      </div>
    </div>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? "#a3ff12" : value >= 45 ? "#00f0ff" : "#ffb454";
  return (
    <div className="w-full max-w-[130px]">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[9px] tracking-[0.18em] text-slate-500">CONFIDENCE</span>
        <span className="font-mono text-[10px]" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1 rounded-full bg-slate-700/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}88` }}
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function Pipeline({ status }: { status: string }) {
  const upper = String(status || "").toUpperCase();
  const idx = PIPELINE.indexOf(upper);
  const isExpired = upper === "EXPIRED";
  const reached = idx >= 0 ? idx + 1 : isExpired ? PIPELINE.length + 1 : 1;
  return (
    <ol className="flex flex-wrap items-center gap-y-2">
      {PIPELINE.map((stage, i) => {
        const done = i < reached;
        const active = i === reached - 1 && !isExpired;
        return (
          <li key={stage} className="flex items-center">
            <div className="flex flex-col items-center gap-1 min-w-[64px]">
              <motion.span
                className={`block h-2.5 w-2.5 rounded-full border ${
                  done
                    ? stage === "VERIFIED"
                      ? "bg-lime-neon border-lime-neon shadow-glow-lime"
                      : "bg-cyan border-cyan shadow-glow-cyan"
                    : "border-slate-600 bg-transparent"
                }`}
                animate={active && !reducedSafe() ? { scale: [1, 1.5, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.6 }}
              />
              <span className={`font-mono text-[8px] tracking-[0.16em] ${done ? "text-slate-200" : "text-slate-600"}`}>
                {stage}
              </span>
            </div>
            {i < PIPELINE.length - 1 && (
              <span className={`mx-1 h-px w-4 md:w-7 ${i < reached - 1 ? "bg-cyan/60" : "bg-slate-700"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function reducedSafe() {
  try { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  catch { return true; }
}

export function Unknown({ children }: { children?: React.ReactNode }) {
  return <span className="font-mono text-xs uppercase tracking-widest text-slate-600">{children || "UNKNOWN"}</span>;
}

