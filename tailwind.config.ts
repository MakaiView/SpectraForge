import type { Config } from "tailwindcss";

/**
 * All colors resolve through the --sf-* CSS custom properties defined in
 * app/globals.css. Dark/Light swap via the `data-sf` attribute on <html>;
 * accent swaps by overriding --sf-accent* inline. Never hardcode hex in
 * components — go through these tokens so theme/accent stays a one-attribute
 * swap (README §Interactions, BUILD_SPEC §1).
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sf: {
          bg: "var(--sf-bg)",
          surface: "var(--sf-surface)",
          "surface-2": "var(--sf-surface-2)",
          "surface-3": "var(--sf-surface-3)",
          line: "var(--sf-line)",
          "line-strong": "var(--sf-line-strong)",
          text: "var(--sf-text)",
          "text-2": "var(--sf-text-2)",
          "text-3": "var(--sf-text-3)",
          accent: "var(--sf-accent)",
          "accent-strong": "var(--sf-accent-strong)",
          "accent-soft": "var(--sf-accent-soft)",
          "accent-ring": "var(--sf-accent-ring)",
          success: "var(--sf-success)",
          "success-soft": "var(--sf-success-soft)",
          warn: "var(--sf-warn)",
          "warn-soft": "var(--sf-warn-soft)",
          danger: "var(--sf-danger)",
          "danger-soft": "var(--sf-danger-soft)",
          // laser-type accents (README + DATA_MODEL MACHINE_TYPES)
          co2: "#f3934f",
          fiber: "#3f97ff",
          diode: "#3dd68c",
          uv: "#a672f6",
          ir: "#f2647e",
          forge: "#f5872f",
        },
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        "sf-e1": "var(--sf-e1)",
        "sf-e2": "var(--sf-e2)",
      },
      borderRadius: {
        "sf-card": "14px",
        "sf-tile": "10px",
      },
      keyframes: {
        sfbeam: {
          from: { transform: "translateX(-130%)" },
          to: { transform: "translateX(360%)" },
        },
      },
      animation: {
        sfbeam: "sfbeam 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
