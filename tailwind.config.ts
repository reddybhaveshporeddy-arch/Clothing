import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm aubergine-charcoal ramp — a dressing room at closing time,
        // not a server-rack near-black. Every step keeps a whisper of plum.
        ink: {
          900: "#120d16",
          850: "#170f1c",
          800: "#1e1725",
          750: "#261c2f",
          700: "#2e2237",
          600: "#3d2e48",
          500: "#57435f",
        },
        // Brushed brass — the accent that used to be signal-orange.
        accent: {
          DEFAULT: "#c9a25a",
          soft: "#e0c184",
          dim: "#9c7a3c",
        },
        // Dusty rose — a second, sparing warmth for secondary emphasis.
        rose: {
          DEFAULT: "#c98a9c",
          soft: "#e0aebc",
        },
      },
      fontFamily: {
        // The fallback inside var() matters: an *undefined* custom property
        // invalidates the whole font-family declaration, so the later entries
        // in this list would never be reached.
        sans: [
          "var(--font-sans, ui-sans-serif)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        serif: [
          "var(--font-serif, ui-serif)",
          "Georgia",
          "Cambria",
          "serif",
        ],
      },
      boxShadow: {
        // A warm-tinted, offset, blurred shadow — depth from candlelight,
        // not a flat platform default.
        vellum:
          "0 28px 56px -26px rgba(6,3,9,0.7), 0 2px 0 0 rgba(255,255,255,0.03) inset",
        glow: "0 0 0 1px rgba(201,162,90,0.22), 0 20px 44px -18px rgba(201,162,90,0.4)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        // The signature moment: one slow band of light drifting across the
        // hero, like a hand smoothing silk. Authored once, used sparingly.
        sheen: {
          "0%, 100%": { transform: "translateX(-60%) rotate(8deg)" },
          "50%": { transform: "translateX(60%) rotate(8deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.25s ease both",
        "scale-in": "scale-in 0.22s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s infinite",
        sheen: "sheen 9s cubic-bezier(0.45,0,0.55,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
