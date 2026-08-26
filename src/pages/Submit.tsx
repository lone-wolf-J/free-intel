import { useState } from "react";
import { motion } from "framer-motion";
import { Send, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Panel, SectionTitle } from "@/components/ui/primitives";
import { sfx } from "@/lib/sound";

const STEPS = ["SUBMITTED", "AUTOMATED ANALYSIS", "VERIFICATION", "APPROVED / REJECTED"];

export default function Submit() {
  const [form, setForm] = useState({ url: "", name: "", description: "", why_useful: "" });
  const [done, setDone] = useState<string>("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const res = await api.submit(form);
      setDone(res.message);
      setForm({ url: "", name: "", description: "", why_useful: "" });
      sfx.success();
    } catch (e: any) {
      setErr(String(e.message || e));
      sfx.warn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
      <SectionTitle
        kicker="USER SUBMISSIONS // HUMAN-IN-THE-LOOP"
        title={<>FOUND SOMETHING FREE?<span className="text-slate-600"> // </span><span className="grad-text">FEED THE RADAR.</span></>}
      />

      <Panel bright className="p-5 md:p-7 mb-6">
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="flex items-center gap-2 font-mono text-sm text-lime-neon mb-3">
              <ShieldCheck size={16} /> SUBMISSION CAPTURED
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-2">{done}</p>
            <button onClick={() => setDone("")} className="btn-ghost mt-3">SUBMIT ANOTHER</button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <Field label="URL *" value={form.url} onChange={set("url")} placeholder="https://…" />
            <Field label="NAME" value={form.name} onChange={set("name")} placeholder="Resource name" />
            <Field label="DESCRIPTION" value={form.description} onChange={set("description")} placeholder="What is it?" textarea />
            <Field label="WHY IT IS USEFUL" value={form.why_useful} onChange={set("why_useful")} placeholder="What does it let people build or replace for free?" textarea />
            {err && <div className="font-mono text-xs text-red-neon">✕ {err}</div>}
            <button onClick={submit} disabled={busy || !form.url.trim()} className="btn-neon w-full justify-center disabled:opacity-50">
              <Send size={13} /> {busy ? "TRANSMITTING…" : "SUBMIT FOR VERIFICATION"}
            </button>
          </div>
        )}
      </Panel>

      {/* PIPELINE */}
      <div className="mono-label mb-3">EVERY SUBMISSION ENTERS THE PIPELINE — NOTHING PUBLISHES AUTOMATICALLY</div>
      <ol className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="glass rounded p-3 relative overflow-hidden">
            <div className="font-mono text-[9px] tracking-[0.25em] text-cyan/70 mb-1">{String(i + 1).padStart(2, "0")}</div>
            <div className="font-mono text-[11px] tracking-wider text-slate-200 leading-snug">{s}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: {
  label: string; value: string; onChange: (e: any) => void;
  placeholder?: string; textarea?: boolean;
}) {
  const cls =
    "w-full bg-void/70 border border-slate-700 focus:border-cyan rounded px-3.5 py-2.5 text-sm font-mono text-slate-200 outline-none transition-colors placeholder:text-slate-600";
  return (
    <label className="block">
      <span className="mono-label block mb-1.5">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} className={`${cls} resize-none`} />
      ) : (
        <input value={value} onChange={onChange} placeholder={placeholder} className={cls} />
      )}
    </label>
  );
}
