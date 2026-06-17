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
        sans:    ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono:    ["IBM Plex Mono", "monospace"],
        serif:   ["Fraunces", "Georgia", "serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
