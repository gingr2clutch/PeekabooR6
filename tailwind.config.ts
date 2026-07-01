import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f7f8f8",
        card: "#eef0f0",
        border: "#e3e6e6",
        ink: "#212527",
        muted: "#7e8488",
        brand: "#f2640e",
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
