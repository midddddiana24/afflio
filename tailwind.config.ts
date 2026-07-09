import type { Config } from "tailwindcss";

// Tailwind is included for utility use inside the dashboard/admin build-out.
// The marketing landing page (app/(marketing)/page.tsx) intentionally uses
// the hand-written token system in app/globals.css (see tokens.css section)
// rather than Tailwind classes, to keep the Hallmark design system portable.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--color-paper)",
        "paper-2": "var(--color-paper-2)",
        "paper-3": "var(--color-paper-3)",
        rule: "var(--color-rule)",
        ink: "var(--color-ink)",
        "ink-2": "var(--color-ink-2)",
        muted: "var(--color-muted)",
        accent: "var(--color-accent)",
        focus: "var(--color-focus)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-outlier)"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
    },
  },
  plugins: [],
};

export default config;
