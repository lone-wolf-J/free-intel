import { useReducedMotion } from "framer-motion";

export default function BackgroundFX() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[hsl(0,0%,99%)]"
    >
      {/* Relevana hero gradient - soft pastel */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(280,60%,97%)] via-white to-[hsl(320,55%,97%)] dark:from-[hsl(0,0%,99%)] dark:via-white dark:to-[hsl(280,40%,98%)]" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-white to-transparent" />
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(hsl(280,85%,55%) 1px, transparent 1px)`,
        backgroundSize: "24px 24px"
      }} />
      {/* Soft blur glows */}
      <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-[hsl(280,85%,55%)] rounded-full mix-blend-multiply blur-[80px] opacity-[0.04]" />
      <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-[hsl(320,85%,55%)] rounded-full mix-blend-multiply blur-[80px] opacity-[0.03]" />
      {!reduced && (
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-px h-32 bg-gradient-to-b from-transparent via-[hsl(280,85%,55%)]/20 to-transparent animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="absolute top-1/3 right-1/3 w-px h-24 bg-gradient-to-b from-transparent via-[hsl(240,85%,45%)]/15 to-transparent animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
        </div>
      )}
    </div>
  );
}
