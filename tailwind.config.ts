import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0F1E",
        surface:    "#0F172A",
        card:       "#141E33",
        border:     "#1E2D4A",
        bullish:    "#10B981",
        bearish:    "#EF4444",
        neutral:    "#F59E0B",
        accent:     "#3B82F6",
        muted:      "#64748B",
        text: {
          primary:   "#F1F5F9",
          secondary: "#94A3B8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
