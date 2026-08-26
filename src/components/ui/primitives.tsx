import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

export function Counter({ value, decimals = 0, prefix = "", suffix = "" }: {
  value: number; decimals?: number; prefix?: string; suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const start = performance.now();
    const dur = 1100;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduced]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {prefix}{display.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}
    </span>
  );
}

export function TypeWriter({ text, speed = 22, className = "" }: {
  text: string; speed?: number; className?: string;
}) {
  const [n, setN] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { setN(text.length); return; }
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) { clearInterval(id); return v; }
        return v + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, reduced]);
  return (
    <span className={className}>
      {text.slice(0, n)}
      {n < text.length ? <span className="animate-blink text-cyan">▊</span> : null}
    </span>
  );
}

export function SectionTitle({ kicker, title, right }: {
  kicker: string; title: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <div className="mono-label mb-2 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 bg-lime-neon animate-pulse-dot rounded-full" />
          {kicker}
        </div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-100">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Panel({ children, className = "", bright = false }: {
  children: React.ReactNode; className?: string; bright?: boolean;
}) {
  return (
    <div className={`${bright ? "glass-bright" : "glass"} relative ${className}`}>
      <span aria-hidden className={`absolute -top-px -left-px h-3 w-3 border-t border-l ${bright ? "border-cyan/60" : "border-slate-500/40"}`} />
      <span aria-hidden className={`absolute -bottom-px -right-px h-3 w-3 border-b border-r ${bright ? "border-cyan/60" : "border-slate-500/40"}`} />
      {children}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="glass rounded-lg p-10 text-center">
      <div className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500 mb-2">// NO DATA</div>
      <div className="text-slate-300 font-semibold">{title}</div>
      {hint && <div className="mt-2 text-sm text-slate-500 max-w-md mx-auto">{hint}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-14 gap-3">
      <div className="h-5 w-5 rounded-full border-2 border-cyan/30 border-t-cyan animate-spin" />
      {label && <span className="font-mono text-xs uppercase tracking-widest text-slate-400">{label}</span>}
    </div>
  );
}
