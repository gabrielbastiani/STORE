import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        buttonAlternative: "var(--buttonAlternative)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        backgroundButton: "var(--backgroundButton)",
        hoverButtonBackground: "var(--hoverButtonBackground)",
        activeLink: "var(--activeLink)",
      },
      keyframes: {
        slideIn: {
          from: { width: "0" },
          to: { width: "var(--radix-collapsible-content-width)" },
        },
        slideOut: {
          from: { width: "var(--radix-collapsible-content-width)" },
          to: { width: "0" },
        },
      },
      animation: {
        slideIn: "slideIn 0.28s",
        slideOut: "slideOut 0.28s",
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
    require('@tailwindcss/typography')
  ],
};

export default config;