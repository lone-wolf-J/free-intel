export default function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="font-mono font-bold text-sm tracking-[0.18em] text-slate-200 mb-2">
            FREE<span className="text-cyan">//</span>INTEL
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            DISCOVER → VERIFY → USE → SAVE → REPEAT ♾
          </p>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-slate-500">
          Data integrity policy: Free Intel never fabricates pricing, limits, licenses or savings.
          Records marked <span className="text-amber-neon font-mono">DEMO DATA</span>,{" "}
          <span className="font-mono">UNVERIFIED</span> or{" "}
          <span className="font-mono">UNKNOWN</span> are exactly that until evidence proves otherwise.
        </p>
        <div className="font-mono text-[10px] text-slate-600 tracking-widest">
          $0 INFRA · OPEN SOURCE FIRST · v0.1.0
        </div>
      </div>
    </footer>
  );
}
