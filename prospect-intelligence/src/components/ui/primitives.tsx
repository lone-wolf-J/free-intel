import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

export function Counter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
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
      {prefix}
      {display.toLocaleString(undefined, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

export function TypeWriter({
  text,
  speed = 22,
  className = "",
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, reduced]);
  return (
    <span className={className}>
      {text.slice(0, n)}
      {n < text.length ? (
        <span className="animate-blink text-cyan">_</span>
      ) : null}
    </span>
  );
}

export function SectionTitle({
  kicker,
  title,
  right,
}: {
  kicker: string;
  title: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <div className="mono-label mb-2 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 bg-[hsl(var(--primary))] animate-pulse-dot rounded-full" />
          {kicker}
        </div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "Montserrat, sans-serif" }}>
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

export function Panel({
  children,
  className = "",
  bright = false,
}: {
  children: React.ReactNode;
  className?: string;
  bright?: boolean;
}) {
  return (
    <div
      className={`${bright ? "glass-bright" : "glass"} relative ${className}`}
    >
      <span
        aria-hidden
        className={`absolute -top-px -left-px h-3 w-3 border-t-2 border-l-2 rounded-tl-2xl ${
          bright ? "border-[hsl(var(--primary)/0.25)]" : "border-[hsl(var(--border))]"
        }`}
      />
      <span
        aria-hidden
        className={`absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 rounded-br-2xl ${
          bright ? "border-[hsl(var(--primary)/0.25)]" : "border-[hsl(var(--border))]"
        }`}
      />
      {children}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
  onMouseMove,
}: {
  children: React.ReactNode;
  className?: string;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    ref.current?.style.setProperty("--mx", String(x));
    ref.current?.style.setProperty("--my", String(y));
    onMouseMove?.(e);
  };

  return (
    <div
      ref={ref}
      className={`glass-card ${className}`}
      onMouseMove={handleMouseMove}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <div className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
        // NO DATA
      </div>
      <div className="text-slate-900 font-semibold" style={{ fontFamily: "Montserrat, sans-serif" }}>{title}</div>
      {hint && (
        <div className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
          {hint}
        </div>
      )}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-14 gap-3">
      <div className="h-5 w-5 rounded-full border-2 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))] animate-spin" />
      {label && (
        <span className="font-sans text-xs font-medium uppercase tracking-widest text-slate-500">
          {label}
        </span>
      )}
    </div>
  );
}

export function GlowRing({
  size = 200,
  color = "cyan",
  className = "",
}: {
  size?: number;
  color?: "cyan" | "violet" | "lime";
  className?: string;
}) {
  const colors: any = {
    cyan: "hsl(280 85% 55% / 0.08)",
    violet: "hsl(280 85% 55% / 0.08)",
    lime: "hsl(280 85% 55% / 0.06)",
  };
  return (
    <motion.div
      className={`absolute rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${colors[color]} 0%, transparent 70%)`,
      }}
      animate={{
        scale: [1, 1.15, 1],
        opacity: [0.4, 0.7, 0.4],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export function DataStream({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-px bg-gradient-to-b from-transparent via-cyan/30 to-transparent"
          style={{
            left: `${20 + i * 15}%`,
            height: "60px",
          }}
          animate={{
            y: ["100%", "-100%"],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
