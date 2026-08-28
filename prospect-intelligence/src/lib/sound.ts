let soundEnabled = false;
const audioCtx = typeof window !== "undefined" ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(freq: number, duration: number, vol = 0.08) {
  if (!audioCtx || !soundEnabled) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {}
}

export function sfx() {
  return {
    click: () => playTone(800, 0.08),
    success: () => {
      playTone(600, 0.1);
      setTimeout(() => playTone(900, 0.15), 80);
    },
    scan: () => playTone(400, 0.3, 0.04),
    drop: () => playTone(300, 0.12, 0.06),
    type: () => playTone(1200, 0.03, 0.03),
  };
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(v: boolean) {
  soundEnabled = v;
  if (v && audioCtx?.state === "suspended") {
    audioCtx.resume();
  }
}
