/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base system (Relevana light + Lusion dark)
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
        // Lusion editorial dark
        lusion: {
          void: "#060913",
          panel: "#0c1226",
          edge: "#1a2444",
          ink: "#0f172a",
        },
        // Keep legacy names for compat
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
        heading: ["Montserrat", "Fraunces", "system-ui", "sans-serif"],
        editorial: ["Fraunces", "Montserrat", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["Inter", "ui-sans-serif", "system-ui"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "soft": "0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        "soft-lg": "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        "bento": "0 12px 40px rgba(0,0,0,0.10), 0 2px 12px rgba(0,0,0,0.06)",
        "bento-hover": "0 20px 60px rgba(0,0,0,0.14), 0 4px 20px hsl(280 85% 55% / 0.12)",
        "glow-cyan": "0 0 20px hsl(280 85% 55% / 0.15)",
        "glow-violet": "0 0 20px hsl(280 85% 55% / 0.15)",
        "glow-lime": "0 4px 12px rgba(0,0,0,0.04)",
        "webgl": "0 0 80px hsl(280 85% 55% / 0.20), 0 0 120px hsl(320 85% 55% / 0.12)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
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
        // Lusion x landing.love motion
        "morph-blob": "morphBlob 12s ease-in-out infinite",
        "grain": "grainShift 8s steps(10) infinite",
        "scroll-reveal": "scrollReveal 0.8s cubic-bezier(0.22,1,0.36,1) forwards",
        "bento-hover": "bentoHover 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        "horizontal-scroll": "horizontalScroll 30s linear infinite",
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
        morphBlob: {
          "0%,100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%", transform: "rotate(0deg) scale(1)" },
          "25%": { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%", transform: "rotate(1deg) scale(1.02)" },
          "50%": { borderRadius: "40% 60% 30% 70% / 70% 30% 60% 40%", transform: "rotate(-1deg) scale(0.98)" },
          "75%": { borderRadius: "60% 40% 70% 30% / 30% 60% 40% 70%", transform: "rotate(0.5deg) scale(1.01)" },
        },
        grainShift: {
          "0%,100%": { transform: "translate(0, 0)" },
          "10%": { transform: "translate(-5%, -5%)" },
          "20%": { transform: "translate(-10%, 5%)" },
          "30%": { transform: "translate(5%, -10%)" },
          "40%": { transform: "translate(-5%, 15%)" },
          "50%": { transform: "translate(-10%, 5%)" },
          "60%": { transform: "translate(15%, 0%)" },
          "70%": { transform: "translate(0%, 10%)" },
          "80%": { transform: "translate(3%, -15%)" },
          "90%": { transform: "translate(-10%, 10%)" },
        },
        scrollReveal: {
          "0%": { opacity: 0, transform: "translateY(24px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        bentoHover: {
          "0%": { transform: "translateY(0) scale(1)" },
          "100%": { transform: "translateY(-4px) scale(1.01)" },
        },
        horizontalScroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
