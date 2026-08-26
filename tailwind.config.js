/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#04060d",
        abyss: "#070b16",
        panel: "#0a1020",
        edge: "#141c33",
        cyan: { DEFAULT: "#00f0ff", dim: "#0e7490" },
        violet: { neon: "#a855f7", deep: "#6d28d9" },
        lime: { neon: "#a3ff12" },
        amber: { neon: "#ffb454" },
        red: { neon: "#ff4d5e" }
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"]
      },
      boxShadow: {
        "glow-cyan": "0 0 24px rgba(0,240,255,.25), inset 0 0 12px rgba(0,240,255,.06)",
        "glow-violet": "0 0 24px rgba(168,85,247,.22), inset 0 0 12px rgba(168,85,247,.05)",
        "glow-lime": "0 0 20px rgba(163,255,18,.18)"
      },
      animation: {
        "pulse-dot": "pulseDot 2.4s ease-in-out infinite",
        scanline: "scanline 9s linear infinite",
        "grid-pan": "gridPan 26s linear infinite",
        blink: "blink 1.1s steps(1) infinite",
        floaty: "floaty 7s ease-in-out infinite"
      },
      keyframes: {
        pulseDot: {
          "0%,100%": { opacity: 1, boxShadow: "0 0 0 0 rgba(163,255,18,.5)" },
          "50%": { opacity: .55, boxShadow: "0 0 0 6px rgba(163,255,18,0)" }
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" }
        },
        gridPan: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "56px 56px" }
        },
        blink: { "0%,49%": { opacity: 1 }, "50%,100%": { opacity: 0 } },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        }
      }
    }
  },
  plugins: []
};
