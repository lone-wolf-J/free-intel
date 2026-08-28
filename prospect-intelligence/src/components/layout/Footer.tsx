export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-slate-800/50 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="font-mono text-[10px] tracking-[0.2em] text-slate-600 uppercase">
          Prospect Intelligence — AI-Powered Research
        </div>
        <div className="flex items-center gap-4 text-slate-600">
          <span className="chip border-slate-700/40 text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-neon animate-pulse-dot" />
            SYSTEMS ONLINE
          </span>
        </div>
      </div>
    </footer>
  );
}
