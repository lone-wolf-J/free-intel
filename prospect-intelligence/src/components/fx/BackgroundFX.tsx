import { useReducedMotion } from "framer-motion";

export default function BackgroundFX() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
    >
      {/* Base: light pastel gradient (Relevana) + Lusion dark depth */}
      <div className="absolute inset-0 bg-[hsl(var(--background))]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(280,60%,97%)] via-white to-[hsl(320,55%,97%)] dark:from-[hsl(224,40%,7%)] dark:via-[hsl(224,30%,10%)] dark:to-[hsl(280,30%,12%)]" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-white dark:from-[hsl(224,40%,7%)] to-transparent" />

      {/* Lusion WebGL blobs - morphing, blurred, landing.love WebGL collection */}
      {!reduced && (
        <>
          <div className="webgl-blob w-[700px] h-[500px] -top-32 -left-32 bg-gradient-to-br from-[hsl(320,85%,60%)] to-[hsl(280,85%,55%)]" style={{ animationDelay: "0s" }} />
          <div className="webgl-blob w-[600px] h-[600px] top-1/3 -right-32 bg-gradient-to-br from-[hsl(280,85%,60%)] to-[hsl(240,85%,55%)]" style={{ animationDelay: "-4s" }} />
          <div className="webgl-blob w-[500px] h-[400px] bottom-0 left-1/3 bg-gradient-to-br from-[hsl(240,85%,60%)] to-[hsl(320,85%,55%)]" style={{ animationDelay: "-8s" }} />
        </>
      )}

      {/* landing.love - Minimal grid + 3D depth */}
      <div className="absolute inset-0 grid-bg opacity-[0.03] dark:opacity-[0.06]" />

      {/* Grain overlay - Lusion editorial texture */}
      <div className="grain-overlay" />

      {/* Subtle parallax lines - landing.love horizontal scroll hint */}
      {!reduced && (
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
          <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(280,85%,55%)] to-transparent" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(320,85%,55%)] to-transparent" />
        </div>
      )}
    </div>
  );
}
