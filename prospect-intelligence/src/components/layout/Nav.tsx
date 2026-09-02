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
      <div className="bg-white/80 backdrop-blur-lg border-b border-[hsl(var(--border))] px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <span className="relative flex h-8 w-8 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(320,85%,55%)] to-[hsl(240,85%,45%)] opacity-90" />
            <span className="relative h-2 w-2 rounded-full bg-white shadow-sm" />
          </span>
          <span className="font-heading font-bold text-sm tracking-tight text-slate-900">
            PROSPECT<span className="bg-gradient-to-r from-[hsl(320,85%,55%)] to-[hsl(280,85%,55%)] bg-clip-text text-transparent">//</span>INTEL
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `relative px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-200 flex items-center gap-1.5 ${
                  isActive ? "bg-[hsl(var(--primary))] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <l.icon size={12} />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
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
            className="lg:hidden bg-white border-b border-[hsl(var(--border))] mx-3 mt-2 rounded-2xl overflow-hidden shadow-soft"
            aria-label="Mobile"
          >
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3.5 font-medium text-sm border-b border-[hsl(var(--border))] last:border-0 ${
                    isActive ? "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]" : "text-slate-700"
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
