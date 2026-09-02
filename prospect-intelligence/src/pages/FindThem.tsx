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
  ArrowRight,
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

interface Candidate {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  snippet: string;
  url: string;
  source: string;
  confidence: number;
}

export default function FindThem() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CaseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [resolving, setResolving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const autoSaveToDeck = (data: CaseData) => {
    try {
      const pipelineCase = {
        ...data,
        stage: "new" as const,
        tags: (data as any).tags || [],
        savedToPipeline: true,
      };
      const raw = localStorage.getItem("pi_cases");
      const existing = raw ? JSON.parse(raw) : [];
      if (!existing.find((c: any) => c.id === pipelineCase.id)) {
        existing.unshift(pipelineCase);
        // Keep only latest 50 to avoid storage bloat
        localStorage.setItem("pi_cases", JSON.stringify(existing.slice(0, 50)));
        window.dispatchEvent(new Event("pi_cases_updated"));
      }
    } catch {}
  };

  const runSearch = async (finalQuery: string) => {
    setSearching(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Search failed (${res.status})`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult({ ...data, savedToPipeline: true });
      // Automated: every find automatically creates a record in Intel Deck with glimpse
      autoSaveToDeck(data);
    } catch (err: any) {
      const msg = err.message || "Search failed. Is the backend server running?";
      if (msg.includes("QUOTA") || msg.includes("limit") || msg.includes("exhausted")) {
        setError("AI quota temporarily exhausted (Groq 8000 tokens/min). Retrying with fallback... Please try again in 30s or try a more specific query (name + company).");
      } else {
        setError(msg);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setResult(null);
    setError(null);
    setCandidates(null);

    try {
      // Step 1: Get disambiguation candidates (lightweight, saves deep scrape credits)
      setResolving(true);
      const candRes = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      setResolving(false);
      if (candRes.ok) {
        const candData = await candRes.json();
        const cands: Candidate[] = candData.candidates || [];
        // Only show popup if ambiguous: multiple candidates and top confidence not decisive
        if (cands.length > 1) {
          const top = cands[0]?.confidence || 0;
          const second = cands[1]?.confidence || 0;
          const isAmbiguous = top < 85 || (top - second) < 20;
          if (isAmbiguous) {
            setCandidateQuery(q);
            setCandidates(cands);
            setSearching(false);
            return;
          }
        }
        if (cands.length === 1 && cands[0].confidence >= 85) {
          // Single high-confidence match - use its name directly
          await runSearch(cands[0].name + (cands[0].company ? ` ${cands[0].company}` : ""));
          return;
        }
      }
    } catch (e) {
      console.log("Candidates failed, falling back to direct search", e);
      setResolving(false);
    }
    // Fallback: direct search
    await runSearch(q);
  };

  const handleCandidateSelect = async (c: Candidate) => {
    // Build refined query with name + company + url to ground the deep crawl
    const refined = `${c.name}${c.company ? ` ${c.company}` : ""} ${c.url}`.trim();
    setCandidates(null);
    setQuery(c.name);
    await runSearch(refined);
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
                className="flex-1 bg-transparent outline-none text-slate-900 placeholder-slate-400 font-sans text-sm py-3"
                style={{ opacity: 1 }}
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

      {/* Disambiguation Popup - saves scrape credits */}
      <AnimatePresence>
        {candidates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setCandidates(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] overflow-hidden glass-bright rounded-xl holo-border"
            >
              <div className="p-6 border-b border-slate-700/30">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Users size={18} className="text-cyan" />
                  Which {candidateQuery} did you mean?
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Multiple matches found. Pick the right profile to run deep intelligence (saves scrape credits).
                </p>
              </div>
              <div className="overflow-y-auto max-h-[50vh] p-4 space-y-3">
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCandidateSelect(c)}
                    className="w-full text-left glass-card p-4 rounded-xl hover:border-cyan/40 hover:bg-cyan/5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan/20 to-violet-neon/20 border border-slate-600/30 flex items-center justify-center shrink-0">
                          <User size={16} className="text-slate-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-100 truncate">{c.name}</div>
                          <div className="text-xs text-slate-400 truncate">{c.title}{c.company ? ` — ${c.company}` : ""}</div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {c.location && <span className="chip border-slate-600/30 text-slate-400 text-[10px]"><MapPin size={8} />{c.location}</span>}
                            {c.url && <span className="chip border-cyan/20 text-cyan/70 text-[10px] truncate max-w-[180px]"><Globe size={8} />{new URL(c.url).hostname}</span>}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-2 line-clamp-2">{c.snippet}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-mono font-bold ${c.confidence > 70 ? "text-lime-neon" : c.confidence > 40 ? "text-amber-neon" : "text-slate-500"}`}>{c.confidence}%</div>
                        <div className="text-[10px] text-slate-600 font-mono uppercase">match</div>
                        <ArrowRight size={14} className="text-slate-600 group-hover:text-cyan ml-auto mt-2 transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-slate-700/30 flex gap-2">
                <button onClick={() => setCandidates(null)} className="btn-ghost flex-1 py-2 text-xs">CANCEL</button>
                <button
                  onClick={() => { const q = candidateQuery; setCandidates(null); runSearch(q); }}
                  className="btn-ghost flex-1 py-2 text-xs border-cyan/30 text-cyan"
                >
                  SEARCH ANYWAY — "{candidateQuery}"
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resolving indicator */}
      {resolving && (
        <div className="max-w-4xl mx-auto px-6 pb-4">
          <div className="glass rounded-xl p-4 flex items-center justify-center gap-3">
            <span className="h-4 w-4 rounded-full border-2 border-violet-neon/30 border-t-violet-neon animate-spin" />
            <span className="text-xs font-mono text-slate-400">Finding matching profiles...</span>
          </div>
        </div>
      )}

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
