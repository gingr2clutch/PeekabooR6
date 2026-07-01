import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f6f3ea",
        card: "#ffffff",
        border: "#e2e0d5",
        ink: "#1e211d",
        muted: "#8b8d86",
        brand: "#f2640e",
        teal: "#3f978b",
      },
      borderRadius: {
        card: "14px",
        btn: "8px",
        inner: "10px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
