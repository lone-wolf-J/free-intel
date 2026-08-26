import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Cpu, Layers as LayersIcon, Sparkles, ArrowRightLeft, ExternalLink, Globe, GitBranch, Shield, Zap } from "lucide-react";
import { api, type StackPlan } from "@/lib/api";
import { Panel, SectionTitle, Spinner } from "@/components/ui/primitives";
import { sfx } from "@/lib/sound";

const EXAMPLES = [
  "Create chatting tool",
  "Run a solo company",
  "Build enterprise CRM",
  "Make an AI agent that browses the web",
  "Build a website for my restaurant",
  "Create an e-commerce store",
  "Replace Claude with free alternatives",
  "Replace Microsoft Teams",
  "Replace Notion",
  "Replace Jira",
  "Replace Salesforce CRM",
  "Build an MCP server",
  "Host a website for free",
  "Build an AI recruitment agent",
  "Create an email marketing platform",
  "Set up a data pipeline"
];

interface LayerData {
  layer: string;
  capability: string;
  purpose: string;
  tools: Array<{
    name: string; slug?: string; url: string; description?: string; score: number;
    source: string; free?: boolean; open_source?: boolean; self_hostable?: boolean;
    reasoning?: string; stars?: number; license?: string; note?: string;
  }>;
}

function isLayerArray(layers: any): layers is LayerData[] {
  return Array.isArray(layers);
}

export default function Stacks() {
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState<StackPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [caps, setCaps] = useState<any[]>([]);
  const [openLayer, setOpenLayer] = useState<string | null>(null);

  useEffect(() => {
    api.capabilities()
      .then((res: any) => setCaps(res.capabilities || []))
      .catch(() => {});
  }, []);

  const generate = async (g: string) => {
    if (!g.trim()) return;
    setLoading(true); setErr(""); setPlan(null);
    sfx.verify();
    try {
      const p = await api.generateStack(g);
      setPlan(p);
      // Auto-open first layer
      if (isLayerArray(p.layers) && p.layers.length > 0) {
        setOpenLayer(p.layers[0].layer);
      } else if (typeof p.layers === "object") {
        const keys = Object.keys(p.layers);
        setOpenLayer(keys[0] || null);
      }
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const layerEntries: LayerData[] = isLayerArray(plan?.layers)
    ? plan.layers
    : plan?.layers
      ? Object.entries(plan.layers).map(([layer, tools]) => ({
          layer,
          capability: "",
          purpose: "",
          tools: (tools as any[]).map((t: any) => ({
            name: t.name, slug: t.slug, url: t.url, description: t.description,
            score: t.free_score || 0, source: "database",
            free: (t.free_types || []).includes("free_tier"),
            open_source: (t.free_types || []).includes("open_source"),
            self_hostable: t.self_hostable === "yes"
          }))
        }))
      : [];

  const totalTools = plan?.total_tools || layerEntries.reduce((a, l) => a + l.tools.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <SectionTitle
        kicker="FREE STACK BUILDER"
        title={<>DESCRIBE THE MISSION<span className="text-slate-600"> // </span><span className="grad-text">RECEIVE THE STACK</span></>}
        right={<Link to="/discover" className="btn-ghost">BROWSE RESOURCES</Link>}
      />

      <Panel bright className="p-5 mb-8">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate(goal)}
            placeholder='e.g. "Build an AI recruitment agent" or "Create chatting tool"'
            aria-label="Describe what you want to build"
            className="flex-1 bg-void/70 border border-slate-700 focus:border-cyan rounded px-4 py-3 text-sm font-mono text-slate-200 outline-none transition-colors placeholder:text-slate-600"
          />
          <button onClick={() => generate(goal)} disabled={loading} className="btn-neon justify-center disabled:opacity-50">
            <Sparkles size={14} /> GENERATE STACK
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((x) => (
            <button key={x} onClick={() => { setGoal(x); generate(x); }}
              className="chip border-slate-600/40 text-slate-400 hover:border-violet-neon/60 hover:text-purple-300 transition-colors cursor-pointer">
              {x}
            </button>
          ))}
        </div>
      </Panel>

      {/* CAPABILITY GRAPH */}
      <div className="mb-10">
        <div className="mono-label mb-3">CAPABILITY INDEX // DISCOVERED RESOURCE COUNTS</div>
        {caps.length === 0 ? (
          <Panel className="p-5 text-center text-xs text-slate-500 font-mono">
            NO TAGGED RESOURCES YET — RUN A CRAWL BATCH FROM THE RADAR PAGE
          </Panel>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {caps.map((c: any) => (
              <button key={c.cap}
                onClick={() => { const g = String(c.cap).replace(/-/g, " "); setGoal(g); generate(g); }}
                className={`chip cursor-pointer transition-colors ${goal.toLowerCase().includes(String(c.cap).split("-")[0]) ? "border-cyan text-cyan bg-cyan/10" : "border-slate-600/40 text-slate-400 hover:border-violet-neon/60 hover:text-purple-300"}`}>
                {String(c.cap).replace(/_/g, " ").toUpperCase()} ({c.n})
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <Spinner label="Analyzing your goal · building the perfect stack" />}

      {err && (
        <Panel className="p-4 mb-6 border-red-neon/30">
          <span className="font-mono text-xs text-red-neon">STACK GENERATION FAILED: {err}</span>
        </Panel>
      )}

      <AnimatePresence>
        {plan && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>

            {/* PROJECT SUMMARY */}
            {plan.project_name && (
              <Panel bright className="p-5 md:p-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mono-label mb-1">PROJECT STACK</div>
                    <h2 className="text-lg font-bold text-slate-100 font-mono">{plan.project_name}</h2>
                    {plan.description && (
                      <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-2xl">{plan.description}</p>
                    )}
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-cyan font-mono">{layerEntries.length}</div>
                      <div className="mono-label text-[9px]">LAYERS</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-mono" style={{ color: "#a3ff12" }}>{totalTools}</div>
                      <div className="mono-label text-[9px]">TOOLS</div>
                    </div>
                  </div>
                </div>
                {(plan.estimated_monthly_cost || plan.setup_complexity) && (
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap gap-4 font-mono text-[10px] text-slate-500">
                    {plan.estimated_monthly_cost && <span>COST: <span className="text-cyan">{plan.estimated_monthly_cost}</span></span>}
                    {plan.setup_complexity && <span>COMPLEXITY: <span className="text-cyan">{plan.setup_complexity}</span></span>}
                  </div>
                )}
                {(plan.integrity_note || plan.notes) && (
                  <p className="mt-3 pt-3 border-t border-slate-800/60 text-[11px] leading-relaxed text-slate-500 font-mono">
                    {plan.integrity_note || plan.notes}
                  </p>
                )}
              </Panel>
            )}

            {/* TOOL REPLACEMENTS */}
            {plan.tool_replacements && plan.tool_replacements.length > 0 && (
              <div className="space-y-4 mb-8">
                <div className="mono-label flex items-center gap-2">
                  <ArrowRightLeft size={14} className="text-cyan" />
                  TOOL REPLACEMENTS // {plan.tool_replacements.length} TOOL{plan.tool_replacements.length > 1 ? "S" : ""} TARGETED
                </div>
                {plan.tool_replacements.map((tr, i) => (
                  <motion.div key={tr.replacing} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Panel bright className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="font-mono text-[10px] tracking-[0.25em] text-slate-600">REPLACING</span>
                        <span className="font-mono text-sm font-bold text-red-400 line-through">{tr.replacing}</span>
                        <ArrowRightLeft size={14} className="text-cyan" />
                        <span className="font-mono text-[10px] tracking-[0.25em] text-cyan">FREE ALTERNATIVES</span>
                      </div>
                      {tr.alternatives.length === 0 ? (
                        <p className="text-xs text-slate-500 font-mono">{tr.note || `No verified alternatives found for "${tr.replacing}" yet.`}</p>
                      ) : (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {tr.alternatives.map((a) => (
                            <div key={a.slug} className="bg-void/50 border border-slate-800 hover:border-cyan/30 rounded p-4 transition-colors group">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-200 group-hover:text-cyan transition-colors leading-snug flex items-center gap-1.5">
                                  {a.name} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                                <span className="font-mono text-sm font-bold shrink-0" style={{ color: "#a3ff12" }}>{a.score}</span>
                              </div>
                              <p className="text-[11.5px] leading-relaxed text-slate-500 line-clamp-2 mb-2">{a.description}</p>
                              <div className="flex items-center gap-3 font-mono text-[9px] text-slate-600">
                                <span>EFFICIENCY: <span className="text-cyan">{a.efficiency}%</span></span>
                                <span className="truncate">{a.source}</span>
                              </div>
                              {a.reasoning && (
                                <p className="mt-2 text-[10px] leading-relaxed text-slate-600 italic line-clamp-2">{a.reasoning}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>
                  </motion.div>
                ))}
              </div>
            )}

            {/* STACK LAYERS */}
            {layerEntries.length > 0 && (
              <div className="space-y-3">
                <div className="mono-label flex items-center gap-2 mb-2">
                  <LayersIcon size={14} className="text-cyan" />
                  RECOMMENDED STACK // {layerEntries.length} LAYERS
                </div>
                {layerEntries.map((layerData, li) => {
                  const open = openLayer === layerData.layer;
                  return (
                    <motion.div key={layerData.layer} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: li * 0.07 }}>
                      <Panel className="overflow-hidden">
                        <button
                          onClick={() => { setOpenLayer(open ? null : layerData.layer); sfx.click(); }}
                          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                          aria-expanded={open}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="font-mono text-[10px] tracking-[0.25em] text-slate-600 shrink-0 hidden sm:block">
                              L{String(li + 1).padStart(2, "0")}
                            </span>
                            <span className="font-mono text-sm font-bold tracking-[0.16em] text-cyan truncate">{layerData.layer}</span>
                            <span className="chip border-slate-700 text-slate-500 shrink-0">{layerData.tools.length} TOOL{layerData.tools.length > 1 ? "S" : ""}</span>
                          </div>
                          <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                        </button>
                        {layerData.purpose && open && (
                          <div className="px-5 pb-2 text-[11px] text-slate-500 font-mono">{layerData.purpose}</div>
                        )}
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                              <div className="px-5 pb-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {layerData.tools.map((tool) => (
                                  <div key={tool.slug || tool.name} className="bg-void/50 border border-slate-800 hover:border-cyan/30 rounded p-4 transition-colors group">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-200 group-hover:text-cyan transition-colors leading-snug flex items-center gap-1.5">
                                        {tool.name} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </a>
                                      <span className="font-mono text-sm font-bold shrink-0" style={{ color: "#a3ff12" }}>{tool.score}</span>
                                    </div>
                                    <p className="text-[11.5px] leading-relaxed text-slate-500 line-clamp-2 mb-2">{tool.description || tool.reasoning}</p>
                                    <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] text-slate-600">
                                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">{tool.source}</span>
                                      {tool.free && <span className="px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">FREE</span>}
                                      {tool.open_source && <span className="px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">OSS</span>}
                                      {tool.self_hostable && <span className="px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400">SELF-HOST</span>}
                                      {tool.stars && <span>{tool.stars.toLocaleString()} ★</span>}
                                      {tool.license && <span>{tool.license}</span>}
                                    </div>
                                    {tool.note && (
                                      <p className="mt-2 text-[10px] text-amber-500/70 italic">{tool.note}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Panel>
                      {li < layerEntries.length - 1 && (
                        <div className="flex justify-center py-1">
                          <motion.span
                            animate={{ opacity: [0.25, 1, 0.25] }}
                            transition={{ repeat: Infinity, duration: 2, delay: li * 0.2 }}
                            className="text-cyan font-mono text-sm"
                          >
                            ↓
                          </motion.span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!plan && !loading && !err && (
        <div className="glass rounded-lg p-10 text-center">
          <LayersIcon size={28} className="mx-auto text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Describe anything above — a tool to build, a company to run, a system to replace.
            The AI maps your intent to a complete stack of free and open-source tools.
          </p>
        </div>
      )}
    </div>
  );
}
