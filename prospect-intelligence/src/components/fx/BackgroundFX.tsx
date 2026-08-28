import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

export default function BackgroundFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (window.matchMedia("(max-width: 720px)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    let raf = 0;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const N = 40;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.5 + 0.5,
      hue: Math.random() > 0.7 ? 280 : 185,
    }));

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const tick = () => {
      c!.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      }
      for (let i = 0; i < N; i++) {
        for (let k = i + 1; k < N; k++) {
          const dx = pts[i].x - pts[k].x;
          const dy = pts[i].y - pts[k].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 160 * 160) {
            const a = (1 - Math.sqrt(d2) / 160) * 0.1;
            c!.strokeStyle = `rgba(70,160,255,${a})`;
            c!.beginPath();
            c!.moveTo(pts[i].x, pts[i].y);
            c!.lineTo(pts[k].x, pts[k].y);
            c!.stroke();
          }
        }
      }
      for (const p of pts) {
        c!.fillStyle =
          p.hue === 280
            ? "rgba(168,85,247,0.3)"
            : "rgba(100,200,255,0.35)";
        c!.beginPath();
        c!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c!.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_18%_0%,rgba(45,20,90,0.32),transparent_60%),radial-gradient(ellipse_55%_45%_at_85%_10%,rgba(0,90,130,0.25),transparent_60%),radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(20,30,80,0.28),transparent_65%)]" />
      <div className="absolute inset-0 grid-bg animate-grid-pan" />
      <div className="absolute inset-x-0 top-[38vh] h-[46vh] dot-bg opacity-60" />
      {!reduced && <div className="scanline-el" />}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-70" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(4,6,13,0.2),rgba(4,6,13,0.75))]" />
    </div>
  );
}
