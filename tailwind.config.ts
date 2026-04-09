import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Core surfaces ──────────────────────────────────────────
        background: "#060B14",       // deep midnight navy — brand-aligned, not generic black
        foreground: "#EEF2FF",       // blue-tinted white — warmer than pure white
        card: "#0C1526",             // rich dark navy surface
        "card-hover": "#0F1B30",     // card hover state
        surface: "#0F1A30",          // elevated surface
        primary: "#0D2047",          // deep brand navy
        muted: "#09111F",            // darkest fill
        // ── Brand palette ──────────────────────────────────────────
        accent: "#2563EB",           // institutional blue
        "accent-hover": "#1D55D4",   // accent hover
        "accent-muted": "#1E3A70",   // accent subtle bg
        navy: "#0D1B3E",             // deepest brand navy
        // ── Text ────────────────────────────────────────────────────
        secondary: "#7E92B8",        // muted blue-grey text
        tertiary: "#4E617F",         // very muted text
        // ── Utility ─────────────────────────────────────────────────
        border: "rgba(99, 131, 199, 0.14)",
        "border-strong": "rgba(99, 131, 199, 0.28)",
        success: "#059669",
        warning: "#D97706",
        danger: "#DC2626",
        "success-muted": "#064E3B",
        "warning-muted": "#451A03",
        "danger-muted": "#450A0A",
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
        premium: "0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)",
        card: "0 2px 8px rgba(0, 0, 0, 0.25)",
        elevated: "0 12px 40px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.3)",
        glow: "0 0 24px rgba(37, 99, 235, 0.22)",
        "inner-highlight": "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
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
