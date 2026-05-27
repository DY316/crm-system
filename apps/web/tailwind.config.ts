import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8f6",
          100: "#d7eee9",
          600: "#147568",
          700: "#0f5f56",
          800: "#104d47",
        },
        ink: "#17211f",
      },
      boxShadow: {
        panel: "0 16px 40px rgba(23, 33, 31, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
