/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Relevana-inspired light system
        background: "hsl(0, 0%, 99%)",
        foreground: "hsl(0, 0%, 9%)",
        card: "#ffffff",
        muted: "hsl(0, 0%, 56%)",
        border: "hsl(0, 0%, 93%)",
        primary: {
          DEFAULT: "hsl(280, 85%, 55%)",
          light: "hsl(320, 85%, 55%)",
          dark: "hsl(240, 85%, 45%)",
          foreground: "#ffffff",
        },
        // Keep legacy names for compat but map to light palette
        void: "hsl(0, 0%, 99%)",
        abyss: "hsl(0, 0%, 97%)",
        panel: "#ffffff",
        edge: "hsl(0, 0%, 93%)",
        cyan: { DEFAULT: "hsl(280, 85%, 55%)", dim: "hsl(280, 60%, 93%)" },
        violet: { neon: "hsl(280, 85%, 55%)", deep: "hsl(240, 85%, 45%)" },
        lime: { neon: "hsl(142, 70%, 45%)" },
        amber: { neon: "hsl(38, 92%, 50%)" },
        red: { neon: "hsl(0, 84%, 60%)" },
      },
      fontFamily: {
        display: ["Montserrat", "Inter", "system-ui", "sans-serif"],
        heading: ["Montserrat", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["Inter", "ui-sans-serif", "system-ui"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "soft": "0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        "soft-lg": "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        "glow-cyan": "0 0 20px hsl(280 85% 55% / 0.15)",
        "glow-violet": "0 0 20px hsl(280 85% 55% / 0.15)",
        "glow-lime": "0 4px 12px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      animation: {
        "pulse-dot": "pulseDot 2.4s ease-in-out infinite",
        "floaty": "floaty 7s ease-in-out infinite",
        "ring-pulse": "ringPulse 2s ease-in-out infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "glow-breathe": "glowBreathe 4s ease-in-out infinite",
        "hero-in-left": "heroInLeft 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "hero-in-right": "heroInRight 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "hero-rise": "heroRise 0.6s ease-out forwards",
      },
      keyframes: {
        pulseDot: {
          "0%,100%": { opacity: 1, boxShadow: "0 0 0 0 rgba(168,85,247,.4)" },
          "50%": { opacity: 0.8, boxShadow: "0 0 0 6px rgba(168,85,247,0)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        ringPulse: {
          "0%,100%": { transform: "scale(1)", opacity: 0.4 },
          "50%": { transform: "scale(1.08)", opacity: 0.2 },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glowBreathe: {
          "0%,100%": { boxShadow: "0 0 16px rgba(168,85,247,0.12)" },
          "50%": { boxShadow: "0 0 28px rgba(168,85,247,0.22)" },
        },
        heroInLeft: {
          "0%": { opacity: 0, transform: "translateX(-24px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
        heroInRight: {
          "0%": { opacity: 0, transform: "translateX(24px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
        heroRise: {
          "0%": { opacity: 0, transform: "translateY(16px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
