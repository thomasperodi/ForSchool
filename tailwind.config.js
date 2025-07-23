/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}', // per App Router
    './components/**/*.{js,ts,jsx,tsx}', // se hai una cartella components
  ],
  theme: {
    extend: {
      fontFamily: {
        skoolly: ['GrotaRounded', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
