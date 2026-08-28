import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crosshair, Database, Zap, ArrowRight } from "lucide-react";
import { TypeWriter, GlowRing } from "@/components/ui/primitives";

const features = [
  {
    icon: Crosshair,
    to: "/find",
    title: "Find Them",
    desc: "Enter any name, company, or LinkedIn — AI scans the entire internet to build a complete intelligence dossier.",
    color: "cyan" as const,
  },
  {
    icon: Database,
    to: "/deck",
    title: "Intel Deck",
    desc: "Pipeline, cross-prospect analytics, connection mapping. See patterns across every search you run.",
    color: "violet" as const,
  },
  {
    icon: Zap,
    to: "/action",
    title: "Action Center",
    desc: "AI-generated pitches, custom notes, outreach engine. Turn intelligence into conversations.",
    color: "lime" as const,
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <GlowRing size={500} color="cyan" className="top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
        <GlowRing size={300} color="violet" className="top-1/3 left-1/3 -translate-x-1/2 opacity-20" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <div className="mono-label mb-4 flex items-center justify-center gap-2">
            <span className="inline-block h-1.5 w-1.5 bg-cyan animate-pulse-dot rounded-full" />
            AI-NATIVE INTELLIGENCE PLATFORM
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="grad-text">Prospect</span>
            <br />
            <span className="text-slate-100">Intelligence</span>
          </h1>
          <div className="text-lg md:text-xl text-slate-400 mb-8 max-w-2xl mx-auto h-8">
            <TypeWriter
              text="Scan. Analyze. Engage. — Every prospect. Every signal. Zero cost."
              speed={30}
            />
          </div>
          <Link to="/find" className="btn-neon text-base px-8 py-4">
            BEGIN SCAN
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {features.map((f) => (
            <motion.div key={f.to} variants={fadeUp}>
              <Link to={f.to} className="block h-full">
                <div className="glass-card p-8 h-full group cursor-pointer">
                  <div className="relative z-10">
                    <div
                      className={`h-12 w-12 rounded-lg flex items-center justify-center mb-5 border ${
                        f.color === "cyan"
                          ? "border-cyan/30 bg-cyan/5 text-cyan"
                          : f.color === "violet"
                          ? "border-violet-neon/30 bg-violet-neon/5 text-violet-neon"
                          : "border-lime-neon/30 bg-lime-neon/5 text-lime-neon"
                      }`}
                    >
                      <f.icon size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-cyan transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {f.desc}
                    </p>
                    <div className="mt-5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 group-hover:text-cyan transition-colors">
                      LAUNCH
                      <ArrowRight
                        size={12}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </motion.div>
  );
}
