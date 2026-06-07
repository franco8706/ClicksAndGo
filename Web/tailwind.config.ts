import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2563eb",
          light: "#dbeafe",
          dark: "#1e3a8a",
        }
      },
    },
  },
  plugins: [],
};
export default config;