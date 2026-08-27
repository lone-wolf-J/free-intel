import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Calculator, ShieldQuestion, SearchCheck, ExternalLink, Zap, ArrowRight, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { api, type CostAnalysis, type CostAnalysisLine, type ProductResolution, type Alternative, type Plan } from "@/lib/api";
import { Panel, SectionTitle, Counter, EmptyState } from "@/components/ui/primitives";
import { sfx } from "@/lib/sound";

interface Line {
  name: string;
  spend: string;
  useEstimate: boolean;
  resolution: ProductResolution | null;
  alternatives: Alternative[];
  searchingAlts: boolean;
}

const EMPTY_LINE: Line = { name: "", spend: "", useEstimate: false, resolution: null, alternatives: [], searchingAlts: false };

export default function SaveMoney() {
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [analysis, setAnalysis] = useState<CostAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const update = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const resolve = async (i: number) => {
    const line = lines[i];
    if (!line.name.trim()) return;
    update(i, { resolution: null, alternatives: [], searchingAlts: false });
    try {
      const res = await api.resolveProduct(line.name.trim());
      update(i, { resolution: res });
      sfx[res.resolved ? "discover" : "click"]();
    } catch {
      update(i, { resolution: { resolved: false, message: "Resolution request failed. You can still enter your spend manually." } });
    }
  };

  const searchAlts = useCallback(async (i: number) => {
    const line = lines[i];
    if (!line.name.trim()) return;
    update(i, { searchingAlts: true });
    try {
      const result = await api.searchAlternatives(line.name.trim());
      update(i, { alternatives: result.results || [], searchingAlts: false });
    } catch {
      update(i, { searchingAlts: false });
    }
  }, [lines]);

  const analyze = async () => {
    const payload = lines
      .filter((l) => l.name.trim())
      .map((l) => ({
        name: l.name.trim(),
        monthly_cost: l.spend.trim() === "" ? null : Number(l.spend) || 0,
        use_estimate: !l.spend.trim() && l.useEstimate
      }));
    if (!payload.length) return;
    setLoading(true); setErr(""); setAnalysis(null);
    sfx.verify();
    try {
      const result = await api.analyzeCosts(payload);
      setAnalysis(result);
      // Also search alternatives for each tool
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].name.trim() && lines[i].alternatives.length === 0) {
          searchAlts(i);
        }
      }
      sfx.success();
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
      <SectionTitle
        kicker="COST REDUCTION ENGINE // REAL PRICING OR NOTHING"
        title={<>WHAT ARE WE PAYING FOR<span className="text-slate-600"> — </span><span className="grad-text">THAT COULD BE FREE?</span></>}
      />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* INPUT — LEFT PANEL */}
        <Panel bright className="p-5 lg:col-span-2 h-fit">
          <div className="mono-label mb-4 flex items-center gap-2">
            <Calculator size={13} className="text-cyan" /> YOUR CURRENT STACK
          </div>
          <div className="space-y-4">
            {lines.map((line, i) => (
              <div key={i} className="border border-slate-800 rounded p-3 space-y-2 bg-void/40">
                <div className="flex gap-2">
                  <input
                    value={line.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    onBlur={() => line.name.trim() && resolve(i)}
                    onKeyDown={(e) => e.key === "Enter" && resolve(i)}
                    placeholder={`Tool ${i + 1} e.g. Claude, Notion, Jira...`}
                    aria-label={`Tool ${i + 1} name`}
                    className="flex-1 min-w-0 bg-transparent border border-slate-700 focus:border-cyan rounded px-3 py-2 text-sm font-mono outline-none transition-colors placeholder:text-slate-600"
                  />
                  <button
                    onClick={() => resolve(i)}
                    aria-label="Resolve product"
                    className="p-2 text-slate-500 hover:text-cyan transition-colors border border-slate-700 rounded"
                  >
                    <SearchCheck size={15} />
                  </button>
                  {lines.length > 1 && (
                    <button onClick={() => setLines((x) => x.filter((_, idx) => idx !== i))}
                      aria-label="Remove line" className="p-2 text-slate-600 hover:text-red-neon transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Product info — NO alternatives here */}
                {line.resolution && (
                  <ResolutionInfo res={line.resolution} />
                )}

                <div>
                  <div className="mono-label mb-1">ACTUAL MONTHLY SPEND</div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">$</span>
                    <input
                      value={line.spend}
                      onChange={(e) => update(i, { spend: e.target.value.replace(/[^0-9.]/g, "") })}
                      placeholder="________"
                      inputMode="decimal"
                      aria-label={`Actual monthly spend for ${line.name || `tool ${i + 1}`}`}
                      className="w-full bg-transparent border border-slate-700 focus:border-lime-neon rounded pl-6 pr-3 py-2 text-sm font-mono outline-none transition-colors placeholder:text-slate-700"
                    />
                  </div>

                  {line.resolution?.resolved && line.resolution.pricing_status !== "NO_PRICING_DATA" && (
                    <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={line.useEstimate}
                        disabled={!hasExtractedPrice(line.resolution)}
                        onChange={(e) => update(i, { useEstimate: e.target.checked })}
                        className="accent-lime-neon"
                      />
                      <span className={`font-mono text-[10px] tracking-wider ${hasExtractedPrice(line.resolution) ? "text-lime-neon" : "text-slate-600"}`}>
                        USE VERIFIED PUBLIC ESTIMATE
                        {hasExtractedPrice(line.resolution)
                          ? ` (${Math.min(...extractedPrices(line.resolution)).toFixed(2)}/mo lowest known plan)`
                          : " — unavailable until pricing is extracted"}
                      </span>
                    </label>
                  )}
                  {!line.resolution && (
                    <p className="mt-1 font-mono text-[9px] tracking-wider text-slate-600">
                      UNKNOWN COST STAYS BLANK — IT IS NEVER TREATED AS $0.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setLines((t) => [...t, { ...EMPTY_LINE }])}
            className="mt-3 btn-ghost w-full justify-center">
            <Plus size={12} /> ADD LINE
          </button>

          <button onClick={analyze} disabled={loading} className="btn-neon w-full justify-center mt-6 disabled:opacity-50">
            {loading ? "ANALYZING..." : "ANALYZE MY STACK"}
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500 flex gap-2">
            <ShieldQuestion size={13} className="shrink-0 text-amber-neon mt-0.5" />
            Your entered number is authoritative. Public estimates are used only when you
            explicitly opt in and are labeled as estimates. Nothing is invented.
          </p>
        </Panel>

        {/* RESULTS — RIGHT PANEL */}
        <div className="lg:col-span-3 space-y-4">
          <AnimatePresence mode="wait">
            {err && (
              <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Panel className="p-4 border-red-neon/30">
                  <span className="font-mono text-xs text-red-neon">ANALYSIS FAILED: {err}</span>
                </Panel>
              </motion.div>
            )}

            {/* Show alternatives from real-time search even before analysis */}
            {!analysis && !err && lines.some(l => l.alternatives.length > 0) && (
              <motion.div key="alts-pre" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {lines.filter(l => l.alternatives.length > 0).map((line, i) => (
                  <Panel key={i} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={13} className="text-lime-neon" />
                      <span className="mono-label">ALTERNATIVES FOR {line.name.toUpperCase()}</span>
                    </div>
                    <AlternativesList alts={line.alternatives} toolName={line.name} />
                  </Panel>
                ))}
              </motion.div>
            )}

            {!analysis && !err && !lines.some(l => l.alternatives.length > 0) && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <EmptyState
                  title="No analysis yet."
                  hint="Enter your paid tools above — the engine matches them against 80+ known enterprise tools with verified free alternatives. Enter your spend to see exact savings."
                />
              </motion.div>
            )}
            {analysis && (
              <motion.div key="res" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <Panel bright className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-xl md:text-2xl font-bold text-slate-100"><Counter value={analysis.total_monthly_spend_entered} prefix="$" /></div>
                      <div className="mono-label mt-1">SPEND ENTERED</div>
                    </div>
                    <div>
                      <div className="text-xl md:text-2xl font-bold text-lime-neon"><Counter value={analysis.estimated_monthly_saving} prefix="$" /></div>
                      <div className="mono-label mt-1">EST. MONTHLY SAVING</div>
                    </div>
                    <div>
                      <div className="text-xl md:text-2xl font-bold text-cyan"><Counter value={analysis.estimated_annual_saving} prefix="$" /></div>
                      <div className="mono-label mt-1">EST. ANNUAL SAVING</div>
                    </div>
                    <div>
                      <div className="text-xl md:text-2xl font-bold text-violet-neon">{analysis.lines_analyzed}/{analysis.analyses.length}</div>
                      <div className="mono-label mt-1">LINES COMPUTABLE</div>
                    </div>
                  </div>
                  <p className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] leading-relaxed text-slate-500 font-mono">
                    {analysis.confidence_note}
                  </p>
                </Panel>

                {analysis.analyses.map((a, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <Panel className="p-5">
                      <LineResult a={a} lineIndex={i} searchAlts={searchAlts} />
                    </Panel>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function toArray<T = unknown>(v: unknown, def: T[] = []): T[] { return Array.isArray(v) ? (v as T[]) : def; }
function extractedPrices(res: ProductResolution): number[] {
  return toArray<Plan>(res.product?.plans)
    .map((p) => p.price_month)
    .filter((p): p is number => typeof p === "number" && p > 0);
}

function hasExtractedPrice(res: ProductResolution): boolean {
  return extractedPrices(res).length > 0;
}

function EfficiencyBadge({ efficiency }: { efficiency: number }) {
  if (efficiency >= 85) return <span className="chip border-lime-neon/40 text-lime-neon flex items-center gap-1"><TrendingUp size={9} /> HIGH EFFICIENCY</span>;
  if (efficiency >= 70) return <span className="chip border-cyan/40 text-cyan flex items-center gap-1"><Minus size={9} /> GOOD EFFICIENCY</span>;
  return <span className="chip border-amber-neon/40 text-amber-neon flex items-center gap-1"><TrendingDown size={9} /> LOWER EFFICIENCY</span>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-lime-neon" : score >= 60 ? "bg-cyan" : score >= 40 ? "bg-amber-neon" : "bg-slate-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="font-mono text-[10px] text-slate-500">{score}/100</span>
    </div>
  );
}

function ResolutionInfo({ res }: { res: ProductResolution }) {
  if (!res.resolved) {
    return (
      <div className="font-mono text-[10px] leading-relaxed text-amber-neon bg-amber-neon/5 border border-amber-neon/20 rounded p-2">
        NOT IN DATABASE YET. {res.message || "Enter your spend to find alternatives."}
      </div>
    );
  }

  const p = res.product!;
  const statusColor =
    res.pricing_status === "EXTRACTED_FROM_OFFICIAL_PAGE" ? "text-lime-neon"
    : res.pricing_status === "PAGE_KNOWN_NOT_MACHINE_EXTRACTED" ? "text-amber-neon"
    : "text-slate-500";
  return (
    <div className="bg-panel/60 border border-slate-700/50 rounded p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm text-slate-100">{p.name}</span>
        <span className={`font-mono text-[9px] tracking-widest ${statusColor}`}>{res.pricing_status}</span>
      </div>
      {(p.provider || p.category) && (
        <div className="font-mono text-[9px] tracking-widest text-slate-500">
          {[p.provider, p.category].filter(Boolean).join(" · ").toUpperCase()}
        </div>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] tracking-wider">
        {p.website && (
          <a href={p.website} target="_blank" rel="noreferrer" className="text-cyan/80 hover:text-cyan inline-flex items-center gap-1">
            SITE <ExternalLink size={9} />
          </a>
        )}
        {p.pricing_url && (
          <a href={p.pricing_url} target="_blank" rel="noreferrer" className="text-cyan/80 hover:text-cyan inline-flex items-center gap-1">
            PRICING SOURCE <ExternalLink size={9} />
          </a>
        )}
      </div>
      {toArray<Plan>(p.plans).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {toArray<Plan>(p.plans).slice(0, 5).map((pl, idx) => (
            <span key={idx} className="chip border-slate-600/50 text-slate-300">
              {pl.name}: {typeof pl.price_month === "number" ? `$${pl.price_month}/mo` : "price n/a"}
              {pl.has_free_tier ? " · FREE TIER" : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AlternativesList({ alts, toolName }: { alts: Alternative[]; toolName: string }) {
  return (
    <div className="space-y-2">
      {alts.slice(0, 5).map((alt, idx) => (
        <div key={idx} className="bg-void/40 border border-slate-800 hover:border-slate-600/60 rounded p-3 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {alt.url ? (
                  <a href={alt.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-cyan hover:underline">
                    {alt.name}
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-slate-100">{alt.name}</span>
                )}
                {alt.source && (
                  <span className="chip border-slate-700 text-slate-500 text-[8px]">{alt.source}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{alt.description}</p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <ScoreBar score={alt.score || 0} />
              {alt.efficiency != null && <EfficiencyBadge efficiency={alt.efficiency} />}
            </div>
          </div>
          {alt.reasoning && (
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed border-l-2 border-cyan/20 pl-2">
              {alt.reasoning}
            </p>
          )}
          {alt.key_differences && alt.key_differences.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {alt.key_differences.map((diff, di) => (
                <span key={di} className="chip border-slate-700/50 text-slate-500 text-[8px]">{diff}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LineResult({ a, lineIndex, searchAlts }: { a: CostAnalysisLine; lineIndex: number; searchAlts: (i: number) => void }) {
  const alts = a.alternatives || [];
  const bestAlt = a.replacement;
  const alsoConsidered = a.also_considered || [];

  const statusChip = () => {
    switch (a.status) {
      case "ANALYZED": return bestAlt?.relationship?.includes("OPEN-SOURCE")
        ? <span className="chip border-lime-neon/40 text-lime-neon">VERIFIED ALTERNATIVE</span>
        : bestAlt
          ? <span className="chip border-cyan/40 text-cyan">ALTERNATIVE FOUND</span>
          : <span className="chip border-slate-500/40 text-slate-400">ANALYZED</span>;
      case "NEEDS_COST_INPUT":
        return alts.length > 0
          ? <span className="chip border-lime-neon/40 text-lime-neon">{alts.length} FREE ALTERNATIVE{alts.length > 1 ? "S" : ""}</span>
          : <span className="chip border-amber-neon/40 text-amber-neon">AWAITING YOUR SPEND</span>;
      case "PRODUCT_UNRESOLVED": return <span className="chip border-slate-500/40 text-slate-400">UNRESOLVED</span>;
      case "NO_VERIFIED_ESTIMATE": return <span className="chip border-amber-neon/40 text-amber-neon">NO PUBLIC ESTIMATE</span>;
      case "NO_REPLACEMENT_FOUND": return <span className="chip border-red-neon/40 text-red-neon">NO REPLACEMENT YET</span>;
      default: return <span className="chip border-slate-600/40 text-slate-400">{a.status}</span>;
    }
  };

  const saving = a.monthly_saving ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-semibold text-slate-100">{a.tool}</div>
          {a.cost_basis === "your entered spend" ? (
            <div className="font-mono text-[10px] tracking-widest text-slate-500 mt-0.5">
              CURRENT: ${(a.current_cost ?? 0).toLocaleString()}/mo · YOUR ENTERED SPEND
            </div>
          ) : a.cost_basis ? (
            <div className="font-mono text-[10px] tracking-widest text-amber-neon mt-0.5">
              CURRENT: ${(a.current_cost ?? 0).toLocaleString()}/mo · {a.cost_basis}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {statusChip()}
          {saving > 0 && (
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-lime-neon">-${saving.toLocaleString()}/mo</div>
              <div className="font-mono text-[9px] tracking-widest text-slate-500">-${a.annual_saving?.toLocaleString()}/yr</div>
            </div>
          )}
        </div>
      </div>

      {a.message && <p className="text-xs leading-relaxed text-slate-400 mb-3">{a.message}</p>}

      {/* Best replacement (from DB or seed) */}
      {bestAlt && (
        <div className="bg-void/50 border border-lime-neon/20 rounded p-4 mb-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {bestAlt.url ? (
              <a href={bestAlt.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-lime-neon hover:underline inline-flex items-center gap-1">
                → {bestAlt.name} <ExternalLink size={10} />
              </a>
            ) : (
              <Link to={`/resource/${bestAlt.slug}`} className="text-sm font-semibold text-lime-neon hover:underline">
                → {bestAlt.name}
              </Link>
            )}
            <span className="chip border-cyan/40 text-cyan text-[9px]">{bestAlt.relationship}</span>
          </div>
          {bestAlt.description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{bestAlt.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="font-mono text-[10px] tracking-wider text-slate-500">
              POSSIBLE COST: ${a.possible_cost}/mo
            </div>
            {bestAlt.score != null && (
              <div className="flex items-center gap-1">
                <span className="font-mono text-[9px] text-slate-600">FIT:</span>
                <ScoreBar score={bestAlt.score} />
              </div>
            )}
            {bestAlt.notes && (
              <span className="font-mono text-[9px] text-slate-600 italic truncate max-w-xs">{bestAlt.notes.slice(0, 80)}</span>
            )}
          </div>
        </div>
      )}

      {/* Also considered */}
      {alsoConsidered.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="font-mono text-[9px] tracking-widest text-slate-600 flex items-center gap-1">
            <ArrowRight size={8} /> ALSO CONSIDERED
          </div>
          {alsoConsidered.map((alt: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-2 bg-panel/40 border border-slate-800 rounded p-2 text-[10px]">
              <div className="min-w-0 flex items-center gap-2">
                {alt.url ? (
                  <a href={alt.url} target="_blank" rel="noreferrer" className="font-medium text-slate-300 hover:text-cyan">{alt.name}</a>
                ) : (
                  <span className="font-medium text-slate-300">{alt.name}</span>
                )}
                {alt.description && <span className="text-slate-500 truncate hidden md:inline">{alt.description.slice(0, 40)}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {alt.relationship && <span className="chip border-slate-700 text-slate-500 text-[8px]">{alt.relationship}</span>}
                {alt.score != null && <ScoreBar score={alt.score} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-time alternatives from search */}
      {alts.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[9px] tracking-widest text-lime-neon flex items-center gap-1">
            <Zap size={9} /> {alts.length} ALTERNATIVE{alts.length > 1 ? "S" : ""} FOUND
          </div>
          {alts.slice(0, 5).map((alt: any, idx: number) => (
            <div key={idx} className="bg-void/40 border border-slate-800 rounded p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {alt.url ? (
                      <a href={alt.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-cyan hover:underline">
                        {alt.name}
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-slate-100">{alt.name}</span>
                    )}
                    {alt.source && (
                      <span className="chip border-slate-700 text-slate-500 text-[8px]">{alt.source}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{alt.description}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <ScoreBar score={alt.score || 0} />
                  {alt.efficiency != null && <EfficiencyBadge efficiency={alt.efficiency} />}
                </div>
              </div>
              {alt.reasoning && (
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed border-l-2 border-cyan/20 pl-2">
                  {alt.reasoning}
                </p>
              )}
              {alt.key_differences && alt.key_differences.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {alt.key_differences.map((diff: string, di: number) => (
                    <span key={di} className="chip border-slate-700/50 text-slate-500 text-[8px]">{diff}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search button if no alternatives yet */}
      {alts.length === 0 && !bestAlt && (
        <button
          onClick={() => searchAlts(lineIndex)}
          className="btn-ghost text-xs flex items-center gap-1 mt-2"
        >
          <RefreshCw size={11} /> SEARCH FOR ALTERNATIVES
        </button>
      )}

      {a.recommendation && (
        <p className="mt-3 text-xs leading-relaxed text-slate-400 italic">{a.recommendation}</p>
      )}
    </>
  );
}
