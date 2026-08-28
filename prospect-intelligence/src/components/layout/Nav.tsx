import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Crosshair, Database, Zap } from "lucide-react";

const LINKS = [
  { to: "/find", label: "FIND THEM", icon: Crosshair },
  { to: "/deck", label: "INTEL DECK", icon: Database },
  { to: "/action", label: "ACTION", icon: Zap },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="glass border-x-0 border-t-0 rounded-none px-4 md:px-8 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <span className="relative flex h-7 w-7 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-cyan/50 group-hover:animate-spin [animation-duration:3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-lime-neon shadow-glow-lime" />
          </span>
          <span className="font-mono font-bold text-sm tracking-[0.18em] text-slate-100">
            PROSPECT<span className="text-cyan">//</span>INTEL
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `relative px-3 py-2 font-mono text-[10.5px] tracking-[0.16em] transition-colors duration-200 flex items-center gap-1.5 ${
                  isActive ? "text-cyan" : "text-slate-400 hover:text-slate-100"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <l.icon size={12} />
                  {l.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-2 -bottom-[13px] h-px bg-cyan"
                      style={{ boxShadow: "0 0 12px rgba(0,240,255,.8)" }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="lg:hidden p-2 text-slate-300"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden glass mx-3 mt-2 rounded-lg overflow-hidden"
            aria-label="Mobile"
          >
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3.5 font-mono text-xs tracking-[0.18em] border-b border-slate-700/30 last:border-0 ${
                    isActive ? "text-cyan bg-cyan/5" : "text-slate-300"
                  }`
                }
              >
                <l.icon size={14} />
                <span>{l.label}</span>
              </NavLink>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
