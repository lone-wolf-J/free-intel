import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

export default function TiltCard({ children, className = "", onClick }: {
  children: React.ReactNode; className?: string; onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--mx", x.toFixed(3));
    el.style.setProperty("--my", y.toFixed(3));
    el.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 4).toFixed(2)}deg) rotateY(${((x - 0.5) * 5).toFixed(2)}deg) translateY(-2px)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={onClick}
      whileHover={reduced ? undefined : { boxShadow: "0 0 34px rgba(0,240,255,0.12), inset 0 0 18px rgba(0,240,255,0.03)" }}
      transition={{ duration: 0.25 }}
      className={`holo-card glass rounded-lg ${className}`}
    >
      {children}
    </motion.div>
  );
}
