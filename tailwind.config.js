/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",   // App Router
    "./src/pages/**/*.{js,ts,jsx,tsx}", // Pages Router (se usar)
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      // Exemplo de extensão de design tokens:
      colors: {
        primary: {
          light: "#4f46e5",
          DEFAULT: "#4338ca",
          dark: "#3730a3"
        }
      }
    }
  },
  plugins: [],
}