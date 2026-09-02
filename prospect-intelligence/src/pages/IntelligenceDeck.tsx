import { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Database,
  Filter,
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  MapPin,
  Briefcase,
  TrendingUp,
  ArrowRight,
  Trash2,
  BarChart3,
  Network,
  Sparkles,
  Globe,
  Linkedin,
  Eye,
} from "lucide-react";
import { GlassCard, Panel, Counter, EmptyState, Spinner, GlowRing } from "@/components/ui/primitives";

interface CaseItem {
  id: string;
  query: string;
  person: {
    name: string;
    title: string;
    company: string;
    linkedin: string;
    location: string;
  };
  company: {
    industry: string;
    size: string;
    revenue: string;
    description?: string;
    website?: string;
  };
  stage: "new" | "qualified" | "engaged" | "closed";
  confidenceScore: number;
  tags: string[];
  timestamp: string;
  sections?: { title: string; items: { label: string; value: string }[] }[];
  aiInsights?: string[];
}

const STAGES = [
  { key: "new" as const, label: "NEW", color: "cyan" },
  { key: "qualified" as const, label: "QUALIFIED", color: "violet" },
  { key: "engaged" as const, label: "ENGAGED", color: "lime" },
  { key: "closed" as const, label: "CLOSED", color: "amber" },
];

const STAGE_COLORS: Record<string, string> = {
  cyan: "border-cyan/30 bg-cyan/5",
  violet: "border-violet-neon/30 bg-violet-neon/5",
  lime: "border-lime-neon/30 bg-lime-neon/5",
  amber: "border-amber-neon/30 bg-amber-neon/5",
};

const STAGE_DOT_COLORS: Record<string, string> = {
  cyan: "bg-cyan",
  violet: "bg-violet-neon",
  lime: "bg-lime-neon",
  amber: "bg-amber-neon",
};

function PipelineCard({
  item,
  onStageChange,
  onDelete,
}: {
  item: CaseItem;
  onStageChange: (id: string, stage: CaseItem["stage"]) => void;
  onDelete: (id: string) => void;
}) {
  const stageColor =
    STAGES.find((s) => s.key === item.stage)?.color || "cyan";

  return (
    <GlassCard className="p-4 mb-3">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan/15 to-violet-neon/15 border border-slate-600/30 flex items-center justify-center">
            <User size={14} className="text-slate-300" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {item.person.name}
            </h4>
            <p className="text-[10px] text-slate-500 font-sans">
              {item.person.title || item.person.company || item.query}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1 text-slate-600 hover:text-red-neon transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {item.company.industry && (
          <span className="chip border-slate-600/30 text-slate-400">
            <Briefcase size={8} />
            {item.company.industry}
          </span>
        )}
        {item.person.location && (
          <span className="chip border-slate-600/30 text-slate-400">
            <MapPin size={8} />
            {item.person.location}
          </span>
        )}
        {item.confidenceScore > 0 && (
          <span
            className={`chip ${
              item.confidenceScore > 70
                ? "border-lime-neon/30 text-lime-neon"
                : item.confidenceScore > 40
                ? "border-amber-neon/30 text-amber-neon"
                : "border-red-neon/30 text-red-neon"
            }`}
          >
            {item.confidenceScore}%
          </span>
        )}
      </div>

      {/* Glimpse: summary of who they are */}
      {item.sections?.[0]?.items?.[0]?.value && (
        <div className="mb-3 rounded-lg bg-slate-50 border border-slate-200/60 p-2.5">
          <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400 mb-1">Glimpse</div>
          <div className="text-xs text-slate-600 leading-relaxed line-clamp-3">
            {item.sections[0].items[0].value.slice(0, 160)}
            {item.sections[0].items[0].value.length > 160 ? "…" : ""}
          </div>
          {item.company.description && (
            <div className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">{item.company.description.slice(0, 120)}</div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        {STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => onStageChange(item.id, s.key)}
            className={`flex-1 h-1.5 rounded-full transition-all duration-200 ${
              item.stage === s.key
                ? `${STAGE_DOT_COLORS[s.color]} shadow-lg`
                : "bg-slate-700/50 hover:bg-slate-600/50"
            }`}
            title={s.label}
          />
        ))}
      </div>
    </GlassCard>
  );
}

function StatsBar({ cases }: { cases: CaseItem[] }) {
  const byIndustry: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  cases.forEach((c) => {
    if (c.company.industry)
      byIndustry[c.company.industry] = (byIndustry[c.company.industry] || 0) + 1;
    if (c.person.location)
      byLocation[c.person.location] = (byLocation[c.person.location] || 0) + 1;
  });

  const topIndustries = Object.entries(byIndustry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topLocations = Object.entries(byLocation)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Panel className="rounded-xl p-4 text-center">
        <div className="mono-label mb-1">TOTAL</div>
        <div className="text-2xl font-bold text-cyan">
          <Counter value={cases.length} />
        </div>
      </Panel>
      <Panel className="rounded-xl p-4 text-center">
        <div className="mono-label mb-1">INDUSTRIES</div>
        <div className="text-2xl font-bold text-violet-neon">
          <Counter value={Object.keys(byIndustry).length} />
        </div>
      </Panel>
      <Panel className="rounded-xl p-4 text-center">
        <div className="mono-label mb-1">LOCATIONS</div>
        <div className="text-2xl font-bold text-lime-neon">
          <Counter value={Object.keys(byLocation).length} />
        </div>
      </Panel>
      <Panel className="rounded-xl p-4 text-center">
        <div className="mono-label mb-1">AVG CONFIDENCE</div>
        <div className="text-2xl font-bold text-amber-neon">
          <Counter
            value={
              cases.length
                ? Math.round(
                    cases.reduce((a, c) => a + c.confidenceScore, 0) / cases.length
                  )
                : 0
            }
            suffix="%"
          />
        </div>
      </Panel>
    </div>
  );
}

function ConnectionInsights({ cases }: { cases: CaseItem[] }) {
  if (cases.length < 2) return null;

  const byIndustry: Record<string, string[]> = {};
  const byLocation: Record<string, string[]> = {};
  cases.forEach((c) => {
    const name = c.person.name;
    if (c.company.industry) {
      if (!byIndustry[c.company.industry]) byIndustry[c.company.industry] = [];
      byIndustry[c.company.industry].push(name);
    }
    if (c.person.location) {
      if (!byLocation[c.person.location]) byLocation[c.person.location] = [];
      byLocation[c.person.location].push(name);
    }
  });

  const clusters = [
    ...Object.entries(byIndustry)
      .filter(([, names]) => names.length >= 2)
      .map(([k, names]) => ({
        type: "Industry",
        key: k,
        people: names,
        icon: Briefcase,
      })),
    ...Object.entries(byLocation)
      .filter(([, names]) => names.length >= 2)
      .map(([k, names]) => ({
        type: "Location",
        key: k,
        people: names,
        icon: MapPin,
      })),
  ];

  if (clusters.length === 0) return null;

  return (
    <Panel bright className="rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Network size={14} className="text-cyan" />
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-cyan">
          Cross-Prospect Connections
        </span>
      </div>
      <div className="space-y-3">
        {clusters.map((cl, i) => (
          <motion.div
            key={`${cl.type}-${cl.key}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-3"
          >
            <cl.icon size={14} className="text-slate-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs text-slate-400">
                {cl.type}: <span className="text-slate-200 font-semibold">{cl.key}</span>
              </span>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {cl.people.join(", ")} — Consider a vertical approach
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
}

export default function IntelligenceDeck() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pi_cases");
    if (stored) {
      try {
        setCases(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pi_cases", JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    const loadCases = () => {
      const stored = localStorage.getItem("pi_cases");
      if (stored) {
        try { setCases(JSON.parse(stored)); } catch {}
      }
    };
    const onUpdate = () => loadCases();
    const onStorage = (e: StorageEvent) => { if (e.key === "pi_cases") loadCases(); };
    window.addEventListener("pi_cases_updated", onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("pi_cases_updated", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handleStageChange = (id: string, stage: CaseItem["stage"]) => {
    setCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage } : c))
    );
  };

  const handleDelete = (id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
  };

  const filtered = cases.filter((c) => {
    if (filterIndustry && c.company.industry !== filterIndustry) return false;
    if (filterLocation && c.person.location !== filterLocation) return false;
    return true;
  });

  const industries = [...new Set(cases.map((c) => c.company.industry).filter(Boolean))];
  const locations = [...new Set(cases.map((c) => c.person.location).filter(Boolean))];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 md:px-6 py-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="mono-label mb-2 flex items-center gap-2">
            <Database size={10} className="text-violet-neon" />
            INTELLIGENCE DECK
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
            Pipeline & Analytics
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost ${showFilters ? "text-cyan border-cyan/30" : ""}`}
          >
            <Filter size={12} />
            FILTERS
            {(filterIndustry || filterLocation) && (
              <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
            )}
          </button>
          <Link to="/find" className="btn-neon text-xs px-4 py-2">
            + NEW SEARCH
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <Panel className="rounded-xl p-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="mono-label block mb-1.5">Industry</label>
                  <select
                    value={filterIndustry}
                    onChange={(e) => setFilterIndustry(e.target.value)}
                    className="input-glass text-xs py-2 px-3 w-48"
                  >
                    <option value="">All Industries</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mono-label block mb-1.5">Location</label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="input-glass text-xs py-2 px-3 w-48"
                  >
                    <option value="">All Locations</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                {(filterIndustry || filterLocation) && (
                  <button
                    onClick={() => {
                      setFilterIndustry("");
                      setFilterLocation("");
                    }}
                    className="btn-ghost text-xs self-end"
                  >
                    CLEAR
                  </button>
                )}
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      <StatsBar cases={filtered} />
      <ConnectionInsights cases={filtered} />

      {filtered.length === 0 ? (
        <EmptyState
          title="No prospects yet"
          hint="Start by searching for someone on the Find Them page. Cases will appear here for pipeline management."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((stage) => {
            const stageCases = filtered.filter((c) => c.stage === stage.key);
            const stageColor = stage.color;
            return (
              <div key={stage.key}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`h-2 w-2 rounded-full ${STAGE_DOT_COLORS[stageColor]}`}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    {stage.label}
                  </span>
                  <span className="font-mono text-[10px] text-slate-600">
                    ({stageCases.length})
                  </span>
                </div>
                <div
                  className={`rounded-xl border border-dashed p-3 min-h-[200px] ${
                    STAGE_COLORS[stageColor]
                  }`}
                >
                  {stageCases.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                        Empty
                      </div>
                    </div>
                  ) : (
                    stageCases.map((item) => (
                      <PipelineCard
                        key={item.id}
                        item={item}
                        onStageChange={handleStageChange}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
