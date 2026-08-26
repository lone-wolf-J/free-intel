import { Link } from "react-router-dom";
import { ArrowUpRight, Github, ExternalLink } from "lucide-react";
import type { Resource } from "@/lib/api";
import TiltCard from "@/components/ui/TiltCard";
import { ScoreRing, ConfidenceBar, StatusBadge, FreeTypeChips } from "@/components/ui/badges";

export default function ResourceCard({ r, index = 0 }: { r: Resource; index?: number }) {
  return (
    <TiltCard className="p-4 md:p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-mono text-[9px] tracking-[0.2em] text-slate-500">
              {String(r.category || "UNCATEGORIZED").toUpperCase()}
            </span>
            <StatusBadge status={r.verification_status} />
            {r.alt_kind && (
              <span className="chip border-violet-neon/40 text-purple-300">{String(r.alt_kind).replace(/_/g, " ").toUpperCase()}</span>
            )}
          </div>
          <Link
            to={`/resource/${r.slug}`}
            className="block font-semibold text-[15px] leading-snug text-slate-100 hover:text-cyan transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {r.name}
          </Link>
        </div>
        <ScoreRing score={r.free_score} />
      </div>

      <p className="text-[13px] leading-relaxed text-slate-400 line-clamp-2 min-h-[38px]">
        {r.description}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <FreeTypeChips types={r.free_types} />
      </div>

      <div className="mt-auto pt-1 flex items-end justify-between gap-3">
        <ConfidenceBar value={r.confidence_score} />
        <div className="flex items-center gap-1.5">
          {r.github_url && (
            <a
              href={r.github_url} target="_blank" rel="noreferrer"
              aria-label={`${r.name} on GitHub`}
              className="p-1.5 rounded border border-slate-600/30 text-slate-500 hover:text-violet-neon hover:border-violet-neon/40 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Github size={14} />
            </a>
          )}
          {r.url && (
            <a
              href={r.url} target="_blank" rel="noreferrer"
              aria-label={`Visit ${r.name}`}
              className="p-1.5 rounded border border-slate-600/30 text-slate-500 hover:text-cyan hover:border-cyan/40 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
          )}
          <Link
            to={`/resource/${r.slug}`}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-cyan/80 hover:text-cyan px-2 py-1.5"
          >
            Dossier <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      <div className="font-mono text-[9px] text-slate-600 tracking-wider">
        #{String(index + 1).padStart(3, "0")} · {String(r.resource_type).toUpperCase()} · ORIGIN: {String(r.origin).toUpperCase()}
      </div>
    </TiltCard>
  );
}
