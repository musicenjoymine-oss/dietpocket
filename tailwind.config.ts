import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        volt: { DEFAULT: "#c6ff3d", dark: "#8fd400" },
        ink: { 900: "#0b0f14", 800: "#121820", 700: "#1a222d", 600: "#263140" },
      },
      boxShadow: {
        glow: "0 0 0 3px rgba(198,255,61,.35), 0 0 24px rgba(198,255,61,.55)",
      },
    },
  },
  plugins: [],
};
export default config;
