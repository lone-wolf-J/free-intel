let ctx: AudioContext | null = null;
let enabled = false;

export function setSoundEnabled(v: boolean) {
  enabled = v;
  try { localStorage.setItem("fi-sound", v ? "1" : "0"); } catch { /* noop */ }
}

export function isSoundEnabled() {
  return enabled;
}

export function loadSoundPref() {
  try { enabled = localStorage.getItem("fi-sound") === "1"; } catch { /* noop */ }
  return enabled;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number) {
  if (!enabled) return;
  try {
    ctx ||= new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch { /* audio unavailable */ }
}

export const sfx = {
  click: () => tone(660, 0.07, "square", 0.03),
  discover: () => { tone(520, 0.09, "sine", 0.05); setTimeout(() => tone(780, 0.12, "sine", 0.05), 90); },
  verify: () => { tone(440, 0.08, "sine", 0.05); setTimeout(() => tone(660, 0.08, "sine", 0.05), 80); setTimeout(() => tone(880, 0.14, "sine", 0.05), 160); },
  success: () => { tone(523, 0.1, "triangle", 0.06); setTimeout(() => tone(784, 0.16, "triangle", 0.06), 110); },
  warn: () => tone(220, 0.22, "sawtooth", 0.04),
  hum: () => tone(84, 0.9, "sine", 0.02)
};
