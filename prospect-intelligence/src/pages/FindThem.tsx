import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Crosshair,
  Globe,
  Building2,
  User,
  Linkedin,
  ExternalLink,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  MapPin,
  Briefcase,
  Newspaper,
  TrendingUp,
  AlertTriangle,
  FileText,
  Award,
  Activity,
  Star,
  Target,
  Brain,
  Users,
  BarChart3,
  MessageCircle,
  HelpCircle,
  Send,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";
import { GlassCard, Panel, GlowRing, TypeWriter, DataStream } from "@/components/ui/primitives";

interface IntelSection {
  title: string;
  items: { label: string; value: string; confidence?: number }[];
}

interface CaseData {
  id: string;
  query: string;
  timestamp: string;
  person: {
    name: string;
    title: string;
    company: string;
    linkedin: string;
    location: string;
    email?: string;
  };
  company: {
    name: string;
    industry: string;
    size: string;
    revenue: string;
    founded: string;
    headquarters: string;
    website: string;
    description: string;
  };
  sections: IntelSection[];
  aiInsights: string[];
  confidenceScore: number;
  savedToPipeline: boolean;
}

const SECTION_ICONS: Record<string, any> = {
  "Executive Summary": FileText,
  "Executive Profile": User,
  "Career Progression": Briefcase,
  "Current Role & Responsibilities": Target,
  "Organization Intelligence": Building2,
  "Recent Public Activity": Newspaper,
  "Thought Leadership Analysis": Brain,
  "Professional Interests": Star,
  "Technology Landscape": Zap,
  "Business Priorities": BarChart3,
  "Buying Signal Analysis": Target,
  "Business Challenges": AlertCircle,
  "Stakeholder & Influence Assessment": Users,
  "Relationship Indicators": MessageCircle,
  "Strategic Sales Assessment": TrendingUp,
  "Personalized Conversation Starters": MessageCircle,
  "Discovery Questions": HelpCircle,
  "Recommended Outreach Strategy": Send,
  "Risks & Unknowns": AlertTriangle,
  "Confidence Assessment": CheckCircle,
  "Career History": Briefcase,
  "Key Achievements": Award,
  "Digital Presence": Globe,
  "Industry Influence": TrendingUp,
  "Identity": User,
  "Digital Footprint": Activity,
  "Google Results": Search,
};

function ScanAnimation({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-bright rounded-xl p-8 text-center"
    >
      <GlowRing size={150} color="cyan" className="mx-auto -mt-4" />
      <div className="relative z-10">
        <div className="h-16 w-16 mx-auto mb-4 rounded-full border-2 border-cyan/30 border-t-cyan animate-spin" />
        <h3 className="text-lg font-bold text-slate-100 mb-2">
          Scanning Intelligence Networks
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          <TypeWriter text={`Analyzing: "${query}"`} speed={25} />
        </p>
        <DataStream className="h-8" />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {["Web Search", "AI Analysis", "Industry Data", "Company Intel", "Role Mapping"].map(
            (src, i) => (
              <motion.span
                key={src}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.5 }}
                className="chip border-cyan/20 text-cyan/70"
              >
                <span className="h-1 w-1 rounded-full bg-cyan animate-pulse" />
                {src}
              </motion.span>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

function IntelSectionCard({ section, index }: { section: IntelSection; index: number }) {
  const [expanded, setExpanded] = useState(index < 5);
  const Icon = SECTION_ICONS[section.title] || Star;
  const isHighPriority = index < 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className={`glass-card overflow-hidden ${isHighPriority ? "border-l-2 border-l-cyan/40" : ""}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
              isHighPriority
                ? "bg-cyan/10 border border-cyan/30"
                : "bg-slate-800/50 border border-slate-700/30"
            }`}>
              <Icon size={14} className={isHighPriority ? "text-cyan" : "text-slate-400"} />
            </div>
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-slate-300">
                {section.title}
              </span>
              <span className="ml-2 text-[10px] text-slate-600 font-mono">
                {section.items.length} {section.items.length === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHighPriority && (
              <span className="chip border-cyan/30 text-cyan text-[9px]">KEY</span>
            )}
            {expanded ? (
              <ChevronUp size={14} className="text-slate-500" />
            ) : (
              <ChevronDown size={14} className="text-slate-500" />
            )}
          </div>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {section.items.map((item, i) => (
                  <div key={i} className="group">
                    <div className="flex items-start gap-3">
                      <span className="text-cyan/60 mt-1 shrink-0 text-[10px]">&#9656;</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                          {item.label}
                        </div>
                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {item.value}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CaseDossier({ data, onSave }: { data: CaseData; onSave: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      {/* Header Card */}
      <div className="glass-bright rounded-xl p-6 holo-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-cyan/20 to-violet-neon/20 border border-cyan/30 flex items-center justify-center">
              <User size={24} className="text-cyan" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{data.person.name}</h2>
              <p className="text-sm text-slate-400">
                {data.person.title}
                {data.person.company && ` — ${data.person.company}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="mono-label">CONFIDENCE</span>
              <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${data.confidenceScore}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={`h-full rounded-full ${
                    data.confidenceScore > 70
                      ? "bg-lime-neon"
                      : data.confidenceScore > 40
                      ? "bg-amber-neon"
                      : "bg-red-neon"
                  }`}
                />
              </div>
              <span className="font-mono text-xs text-slate-400">{data.confidenceScore}%</span>
            </div>
            {!data.savedToPipeline ? (
              <button onClick={onSave} className="btn-neon text-xs px-4 py-2">
                <Plus size={12} />
                SAVE TO PIPELINE
              </button>
            ) : (
              <span className="chip border-lime-neon/40 text-lime-neon">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-neon animate-pulse-dot" />
                IN PIPELINE
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.person.linkedin && (
            <a href={data.person.linkedin} target="_blank" rel="noopener"
              className="chip border-cyan/30 text-cyan hover:bg-cyan/10 transition-colors">
              <Linkedin size={10} /> LinkedIn <ExternalLink size={8} />
            </a>
          )}
          {data.person.location && (
            <span className="chip border-slate-600/40 text-slate-400">
              <MapPin size={10} /> {data.person.location}
            </span>
          )}
          {data.company.industry && (
            <span className="chip border-violet-neon/30 text-violet-neon/80">
              <Briefcase size={10} /> {data.company.industry}
            </span>
          )}
          {data.company.revenue && (
            <span className="chip border-lime-neon/30 text-lime-neon/80">
              <BarChart3 size={10} /> {data.company.revenue}
            </span>
          )}
        </div>
      </div>

      {/* AI Insights */}
      {data.aiInsights.length > 0 && (
        <Panel bright className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-violet-neon" />
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-violet-neon">
              AI Strategic Insights
            </span>
          </div>
          <div className="space-y-3">
            {data.aiInsights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.15 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-violet-neon/5 border border-violet-neon/10"
              >
                <span className="text-violet-neon mt-0.5 shrink-0 text-xs font-mono font-bold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-slate-300 leading-relaxed">{insight}</span>
              </motion.div>
            ))}
          </div>
        </Panel>
      )}

      {/* All Sections */}
      <div className="space-y-3">
        {data.sections.map((section, i) => (
          <IntelSectionCard key={i} section={section} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

export default function FindThem() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CaseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Search failed. Is the backend server running?");
    } finally {
      setSearching(false);
    }
  };

  const handleSaveToPipeline = async () => {
    if (!result) return;
    // Build pipeline case (per-user localStorage is source of truth for sharing)
    const pipelineCase = {
      ...result,
      stage: "new" as const,
      tags: (result as any).tags || [],
      savedToPipeline: true,
    };
    // 1) Try server (best-effort, ephemeral on Vercel)
    try {
      await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pipelineCase),
      });
    } catch {}
    // 2) Always persist to localStorage so Intel Deck + Action Center see it per-browser
    try {
      const raw = localStorage.getItem("pi_cases");
      const existing = raw ? JSON.parse(raw) : [];
      // Avoid duplicates by id
      if (!existing.find((c: any) => c.id === pipelineCase.id)) {
        existing.unshift(pipelineCase);
        localStorage.setItem("pi_cases", JSON.stringify(existing));
        // Notify other tabs/pages in same browser
        window.dispatchEvent(new Event("pi_cases_updated"));
      }
    } catch {}
    setResult({ ...result, savedToPipeline: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <section className="relative min-h-[40vh] flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <GlowRing size={400} color="cyan" className="top-0 left-1/2 -translate-x-1/2 opacity-20" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center mb-8"
        >
          <div className="mono-label mb-3 flex items-center justify-center gap-2">
            <Crosshair size={10} className="text-cyan" />
            INTELLIGENCE SCANNER
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">Find Them</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Enter a name, company, role, or LinkedIn URL. AI scans the internet to build a
            complete 20+ section intelligence dossier.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <div className="glass-bright rounded-xl p-2 flex items-center gap-2 holo-border">
            <div className="flex-1 flex items-center gap-3 px-3">
              <Search size={18} className="text-cyan shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder='e.g. "Satya Nadella Microsoft" or "linkedin.com/in/johndoe"'
                className="flex-1 bg-transparent outline-none text-slate-200 placeholder-slate-500 font-mono text-sm py-3"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!query.trim() || searching}
              className="btn-neon px-6 py-3 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {searching ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-cyan/30 border-t-cyan animate-spin" />
                  SCANNING
                </span>
              ) : (
                <>
                  <Crosshair size={14} />
                  SCAN
                </>
              )}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {["Person name + company", "LinkedIn URL", "Company + role", "Email address"].map(
              (hint) => (
                <span key={hint} className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                  {hint}
                </span>
              )
            )}
          </div>
        </motion.div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-24">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl p-6 border border-red-neon/20 mb-6"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-red-neon" />
              <div>
                <div className="text-sm font-bold text-red-neon">Search Failed</div>
                <div className="text-xs text-slate-400 mt-1">{error}</div>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {searching && <ScanAnimation key="scan" query={query} />}
          {result && !searching && (
            <CaseDossier key="result" data={result} onSave={handleSaveToPipeline} />
          )}
        </AnimatePresence>
      </section>
    </motion.div>
  );
}
