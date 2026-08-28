import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Zap,
  User,
  Briefcase,
  MapPin,
  Sparkles,
  Copy,
  Check,
  Save,
  FileText,
  ChevronDown,
  Linkedin,
  Globe,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
} from "lucide-react";
import { GlassCard, Panel, EmptyState, GlowRing } from "@/components/ui/primitives";

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
  };
  stage: string;
  confidenceScore: number;
}

interface Pitch {
  id: string;
  caseId: string;
  subject: string;
  body: string;
  tone: string;
  notes: string;
  customFields: { key: string; value: string }[];
  createdAt: string;
}

const TONES = [
  { key: "professional", label: "Professional", desc: "Formal, polished, business-first" },
  { key: "friendly", label: "Friendly", desc: "Warm, approachable, personal" },
  { key: "direct", label: "Direct", desc: "Straight to the point, no fluff" },
  { key: "consultative", label: "Consultative", desc: "Value-focused, advisory tone" },
  { key: "urgent", label: "Urgent", desc: "Time-sensitive, action-driven" },
];

function PitchPreview({ pitch }: { pitch: Pitch }) {
  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={14} className="text-cyan" />
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-cyan">
          Pitch Preview
        </span>
        <span className="chip border-slate-600/30 text-slate-500 ml-auto">
          {pitch.tone}
        </span>
      </div>
      <div className="border-l-2 border-cyan/30 pl-4 mb-4">
        <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">
          Subject
        </div>
        <div className="text-sm text-slate-200 font-semibold">
          {pitch.subject || "(no subject)"}
        </div>
      </div>
      <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {pitch.body || "(empty pitch)"}
      </div>
      {pitch.notes && (
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">
            Notes
          </div>
          <div className="text-xs text-slate-400">{pitch.notes}</div>
        </div>
      )}
    </div>
  );
}

export default function ActionCenter() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [selectedTone, setSelectedTone] = useState("professional");
  const [pitchSubject, setPitchSubject] = useState("");
  const [pitchBody, setPitchBody] = useState("");
  const [pitchNotes, setPitchNotes] = useState("");
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCaseSelector, setShowCaseSelector] = useState(false);

  useEffect(() => {
    const storedCases = localStorage.getItem("pi_cases");
    const storedPitches = localStorage.getItem("pi_pitches");
    if (storedCases) try { setCases(JSON.parse(storedCases)); } catch {}
    if (storedPitches) try { setPitches(JSON.parse(storedPitches)); } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("pi_pitches", JSON.stringify(pitches));
  }, [pitches]);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  const handleGeneratePitch = async () => {
    if (!selectedCase) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCase.id,
          tone: selectedTone,
          notes: pitchNotes,
          customFields,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPitchSubject(data.subject || "");
        setPitchBody(data.body || "");
      } else {
        throw new Error("API unavailable");
      }
    } catch {
      const name = selectedCase.person.name;
      const company = selectedCase.person.company || selectedCase.company.industry || "your company";
      const title = selectedCase.person.title || "professional";

      const templates: Record<string, { subject: string; body: string }> = {
        professional: {
          subject: `Exploring synergies with ${name}`,
          body: `Hi ${name},\n\nI came across your work as ${title} at ${company} and was impressed by the direction you're taking.\n\nI'd love to explore how we might be able to support your initiatives. Our solutions have helped similar organizations achieve measurable results in efficiency and growth.\n\nWould you be open to a brief 15-minute call this week to discuss potential synergies?\n\nBest regards`,
        },
        friendly: {
          subject: `Loved what you're building at ${company}`,
          body: `Hey ${name}!\n\nI've been following ${company}'s journey and honestly, what you're building is really exciting.\n\nI think there could be some great alignment between what we do and where you're heading. No pitch — just a genuine conversation to see if there's a fit.\n\nCoffee chat sometime? ☕\n\nCheers`,
        },
        direct: {
          subject: `${company} + our platform = results`,
          body: `${name},\n\nQuick one — we've helped companies like ${company} reduce costs by 30% while scaling faster.\n\nWorth a 10-minute call to see if this applies to you?\n\nYes or no — either way, respect your time.`,
        },
        consultative: {
          subject: `Strategic insight for ${company}`,
          body: `Dear ${name},\n\nBased on my analysis of ${company}'s current trajectory and the ${selectedCase.company.industry || "industry"} landscape, I've identified a few opportunities that could accelerate your goals.\n\nI'd welcome the chance to share these insights — no strings attached. Sometimes an outside perspective can illuminate paths forward.\n\nShall we connect?\n\n regards`,
        },
        urgent: {
          subject: `Time-sensitive opportunity for ${company}`,
          body: `${name},\n\nI'll be brief — we're opening a limited partnership window for companies in the ${selectedCase.company.industry || "sector"} space.\n\nGiven ${company}'s position, I wanted to reach out before this closes on [DATE].\n\n15 minutes to determine if this is relevant. Are you available this week?\n\nBest`,
        },
      };

      const template = templates[selectedTone] || templates.professional;
      setPitchSubject(template.subject);
      setPitchBody(template.body);
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePitch = () => {
    if (!selectedCaseId) return;
    const newPitch: Pitch = {
      id: Date.now().toString(),
      caseId: selectedCaseId,
      subject: pitchSubject,
      body: pitchBody,
      tone: selectedTone,
      notes: pitchNotes,
      customFields,
      createdAt: new Date().toISOString(),
    };
    setPitches((prev) => [newPitch, ...prev]);
  };

  const handleCopy = () => {
    const text = `Subject: ${pitchSubject}\n\n${pitchBody}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const updateCustomField = (i: number, key: string, value: string) => {
    setCustomFields((prev) =>
      prev.map((f, idx) => (idx === i ? { key, value } : f))
    );
  };

  const removeCustomField = (i: number) => {
    setCustomFields((prev) => prev.filter((_, idx) => idx !== i));
  };

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
            <Zap size={10} className="text-lime-neon" />
            ACTION CENTER
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
            Pitch Builder & Outreach
          </h1>
        </div>
        <Link to="/find" className="btn-neon text-xs px-4 py-2">
          + NEW PROSPECT
        </Link>
      </div>

      {cases.length === 0 ? (
        <EmptyState
          title="No prospects to pitch"
          hint="Start by finding prospects on the Find Them page, then return here to build personalized pitches."
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Case selector + Controls */}
          <div className="space-y-4">
            <Panel className="rounded-xl p-5">
              <div className="mono-label mb-3">SELECT PROSPECT</div>
              <div className="relative">
                <button
                  onClick={() => setShowCaseSelector(!showCaseSelector)}
                  className="w-full input-glass flex items-center justify-between text-left"
                >
                  <span className={selectedCase ? "text-slate-200" : "text-slate-500"}>
                    {selectedCase
                      ? `${selectedCase.person.name} — ${selectedCase.person.company || selectedCase.query}`
                      : "Choose a prospect..."}
                  </span>
                  <ChevronDown size={14} className="text-slate-500" />
                </button>
                <AnimatePresence>
                  {showCaseSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full left-0 right-0 mt-1 glass rounded-lg overflow-hidden z-20 max-h-60 overflow-y-auto"
                    >
                      {cases.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCaseId(c.id);
                            setShowCaseSelector(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-cyan/5 border-b border-slate-700/30 last:border-0 transition-colors"
                        >
                          <div className="text-sm text-slate-200">
                            {c.person.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {c.person.title || c.person.company || c.query}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Panel>

            {selectedCase && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan/15 to-violet-neon/15 border border-slate-600/30 flex items-center justify-center">
                      <User size={16} className="text-slate-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">
                        {selectedCase.person.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {selectedCase.person.title}{" "}
                        {selectedCase.person.company &&
                          `at ${selectedCase.person.company}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCase.company.industry && (
                      <span className="chip border-slate-600/30 text-slate-400">
                        <Briefcase size={8} />
                        {selectedCase.company.industry}
                      </span>
                    )}
                    {selectedCase.person.location && (
                      <span className="chip border-slate-600/30 text-slate-400">
                        <MapPin size={8} />
                        {selectedCase.person.location}
                      </span>
                    )}
                    {selectedCase.person.linkedin && (
                      <a
                        href={selectedCase.person.linkedin}
                        target="_blank"
                        rel="noopener"
                        className="chip border-cyan/30 text-cyan hover:bg-cyan/10"
                      >
                        <Linkedin size={8} />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            <Panel className="rounded-xl p-5">
              <div className="mono-label mb-3">TONE</div>
              <div className="grid grid-cols-1 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setSelectedTone(t.key)}
                    className={`text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                      selectedTone === t.key
                        ? "border-cyan/40 bg-cyan/5 text-cyan"
                        : "border-slate-700/30 text-slate-400 hover:border-slate-600/50"
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider">
                      {t.label}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel className="rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="mono-label">CUSTOM NOTES</div>
              </div>
              <textarea
                value={pitchNotes}
                onChange={(e) => setPitchNotes(e.target.value)}
                placeholder="Add your own research findings, talking points, or context..."
                className="input-glass min-h-[80px] text-xs resize-y"
              />
            </Panel>

            <Panel className="rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="mono-label">CUSTOM FIELDS</div>
                <button onClick={addCustomField} className="text-cyan text-[10px] font-mono uppercase tracking-wider hover:underline">
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {customFields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={f.key}
                      onChange={(e) => updateCustomField(i, e.target.value, f.value)}
                      placeholder="Label"
                      className="input-glass text-xs py-2 flex-1"
                    />
                    <input
                      value={f.value}
                      onChange={(e) => updateCustomField(i, f.key, e.target.value)}
                      placeholder="Value"
                      className="input-glass text-xs py-2 flex-[2]"
                    />
                    <button
                      onClick={() => removeCustomField(i)}
                      className="p-1 text-slate-600 hover:text-red-neon"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </Panel>

            <button
              onClick={handleGeneratePitch}
              disabled={!selectedCase || generating}
              className="btn-violet w-full py-3 disabled:opacity-40"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-violet-neon/30 border-t-violet-neon animate-spin" />
                  GENERATING...
                </span>
              ) : (
                <>
                  <Sparkles size={14} />
                  GENERATE PITCH
                </>
              )}
            </button>
          </div>

          {/* Right: Pitch Editor + Preview */}
          <div className="space-y-4">
            <Panel className="rounded-xl p-5">
              <div className="mono-label mb-3">SUBJECT LINE</div>
              <input
                value={pitchSubject}
                onChange={(e) => setPitchSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="input-glass"
              />
            </Panel>

            <Panel className="rounded-xl p-5">
              <div className="mono-label mb-3">PITCH BODY</div>
              <textarea
                value={pitchBody}
                onChange={(e) => setPitchBody(e.target.value)}
                placeholder="Write or generate your pitch..."
                className="input-glass min-h-[250px] resize-y font-mono text-sm leading-relaxed"
              />
            </Panel>

            <div className="flex gap-2">
              <button onClick={handleCopy} className="btn-neon flex-1 py-3">
                {copied ? (
                  <>
                    <Check size={14} />
                    COPIED!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    COPY TO CLIPBOARD
                  </>
                )}
              </button>
              <button
                onClick={handleSavePitch}
                disabled={!selectedCaseId || !pitchBody}
                className="btn-ghost flex-1 py-3 disabled:opacity-40"
              >
                <Save size={12} />
                SAVE PITCH
              </button>
            </div>

            {pitchBody && <PitchPreview pitch={{
              id: "",
              caseId: selectedCaseId,
              subject: pitchSubject,
              body: pitchBody,
              tone: selectedTone,
              notes: pitchNotes,
              customFields,
              createdAt: new Date().toISOString(),
            }} />}
          </div>
        </div>
      )}

      {pitches.length > 0 && (
        <div className="mt-12">
          <div className="mono-label mb-4 flex items-center gap-2">
            <FileText size={10} className="text-slate-500" />
            SAVED PITCHES ({pitches.length})
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pitches.map((p) => {
              const caseItem = cases.find((c) => c.id === p.caseId);
              return (
                <GlassCard key={p.id} className="p-4">
                  <div className="text-xs font-bold text-slate-200 mb-1 truncate">
                    {p.subject || "(no subject)"}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mb-2">
                    {caseItem?.person.name || "Unknown"} · {p.tone} ·{" "}
                    {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-3">
                    {p.body}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setPitchSubject(p.subject);
                        setPitchBody(p.body);
                        setSelectedTone(p.tone);
                        setPitchNotes(p.notes);
                        setSelectedCaseId(p.caseId);
                      }}
                      className="text-[10px] font-mono text-cyan hover:underline"
                    >
                      <Edit3 size={10} className="inline mr-1" />
                      EDIT
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `Subject: ${p.subject}\n\n${p.body}`
                        );
                      }}
                      className="text-[10px] font-mono text-slate-500 hover:text-cyan"
                    >
                      <Copy size={10} className="inline mr-1" />
                      COPY
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
