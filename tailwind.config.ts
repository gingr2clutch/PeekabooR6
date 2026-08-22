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
        // Gadgets-mode accent. Chosen dark enough to pass WCAG AA both ways:
        // white on blue is 4.8:1 (buttons) and blue on the cream page is 4.4:1
        // (large/semibold text such as the wordmark). A genuinely pale blue
        // would fail both.
        blue: "#2a75b8",
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
