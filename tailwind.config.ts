import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F6F8FC",
        foreground: "#07162F",
        card: "#FFFFFF",
        "card-hover": "#F8FAFE",
        surface: "#EEF3FA",
        primary: "#0D2047",
        muted: "#E7EDF6",
        accent: "#0D3B86",
        "accent-hover": "#0A2E68",
        "accent-muted": "#DCE8F8",
        navy: "#07162F",
        secondary: "#52647E",
        tertiary: "#7B8CA5",
        border: "rgba(13, 32, 71, 0.13)",
        "border-strong": "rgba(13, 32, 71, 0.26)",
        success: "#059669",
        warning: "#D97706",
        danger: "#DC2626",
        "success-muted": "#DFF7EC",
        "warning-muted": "#FFF1D7",
        "danger-muted": "#FEE2E2",
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "0.875rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
      },
      boxShadow: {
        premium: "0 18px 48px rgba(13, 32, 71, 0.10), 0 2px 10px rgba(13, 32, 71, 0.06)",
        card: "0 8px 24px rgba(13, 32, 71, 0.07)",
        elevated: "0 24px 70px rgba(13, 32, 71, 0.18), 0 4px 16px rgba(13, 32, 71, 0.08)",
        glow: "0 0 28px rgba(13, 59, 134, 0.16)",
        "inner-highlight": "inset 0 1px 0 rgba(255, 255, 255, 0.88)",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      letterSpacing: {
        widest2: "0.2em",
        widest3: "0.3em",
      },
    }
  },
  plugins: []
};

export default config;
