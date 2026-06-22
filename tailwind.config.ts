import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background:    "rgb(var(--bg) / <alpha-value>)",
        surface:       "rgb(var(--surface) / <alpha-value>)",
        card:          "rgb(var(--card) / <alpha-value>)",
        "card-hi":     "rgb(var(--card-hi) / <alpha-value>)",
        border:        "rgb(var(--border) / <alpha-value>)",
        "border-soft": "rgb(var(--border-soft) / <alpha-value>)",
        bullish:       "rgb(var(--bullish) / <alpha-value>)",
        bearish:       "rgb(var(--bearish) / <alpha-value>)",
        neutral:       "rgb(var(--neutral) / <alpha-value>)",
        accent:        "rgb(var(--accent) / <alpha-value>)",
        "accent-dim":  "rgb(var(--accent-dim) / <alpha-value>)",
        muted:         "rgb(var(--muted) / <alpha-value>)",
        text: {
          primary:   "rgb(var(--text-1) / <alpha-value>)",
          secondary: "rgb(var(--text-2) / <alpha-value>)",
        },
      },
      fontFamily: {
        // Single workhorse grotesque. `mono` now also maps to it — numbers stay
        // aligned via `tabular-nums` (proportional face + tabular figures, the
        // modern fintech approach) rather than a literal monospace.
        sans:    ["Hanken Grotesk", "system-ui", "sans-serif"],
        mono:    ["Hanken Grotesk", "system-ui", "sans-serif"],
        serif:   ["Hanken Grotesk", "system-ui", "sans-serif"],
        display: ["Bricolage Grotesque", "Hanken Grotesk", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
