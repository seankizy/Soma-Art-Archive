import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#241a10",
        parchment: "#faf4e8",
        parchmentDk: "#f0e7d4",
        rust: "#ec5a2a",       // vermilion — primary accent
        rustLt: "#f47b4f",
        sage: "#1f9488",       // teal — secondary accent
        saffron: "#eaa11f",    // gold
        plum: "#a8408f",       // magenta
        faded: "#9b8b73",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
