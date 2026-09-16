import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0b",
        surface: "#141416",
        surface2: "#1c1c1f",
        border: "#2a2a2e",
        accent: "#6366f1",
        accent2: "#818cf8",
        muted: "#8b8b93",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
