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
        background:    "#080B14",
        surface:       "#0D1322",
        card:          "#111B2E",
        border:        "#1B2B45",
        bullish:       "#00E5AD",
        bearish:       "#FF3D5A",
        neutral:       "#FFB520",
        accent:        "#AAFF45",
        "accent-dim":  "#6BAA20",
        muted:         "#3D5270",
        text: {
          primary:   "#E4EDF8",
          secondary: "#7A93B8",
        },
      },
      fontFamily: {
        sans:  ["IBM Plex Sans",   "system-ui",  "sans-serif"],
        mono:  ["IBM Plex Mono",   "monospace"],
        serif: ["IBM Plex Serif",  "Georgia",    "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
