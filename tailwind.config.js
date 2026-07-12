/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        dyslexic: ['"OpenDyslexic"', 'sans-serif'],
        display: ['"DM Serif Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        plai: {
          teal: '#0a9370',
          'teal-dark': '#077a5c',
          orange: '#f97316',
        },
      },
    },
  },
  plugins: [],
}
