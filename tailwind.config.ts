import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#05070A",
        foreground: "#E5E7EB",
        card: "#0F172A",
        primary: "#0B1F3A",
        accent: "#3B82F6",
        secondary: "#94A3B8",
        border: "rgba(148, 163, 184, 0.18)",
        muted: "#111827",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem"
      },
      boxShadow: {
        premium: "0 16px 60px rgba(2, 6, 23, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
