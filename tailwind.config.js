/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // importante per ShadCN
  content: [
    './app/**/*.{js,ts,jsx,tsx}', // per App Router
    './components/**/*.{js,ts,jsx,tsx}', // se hai una cartella components
  ],
  theme: {
    extend: {
      screens: {
      'tablet': {'min': '768px', 'max': '1024px'},
    },
      fontFamily: {
        skoolly: ['GrotaRounded', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
