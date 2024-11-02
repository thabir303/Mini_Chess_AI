/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'board-light': '#f0d9b5',
        'board-dark': '#b58863',
        'board-highlight': '#829769'
      }
    },
  },
  plugins: [],
}