/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidad visual: neutros cálidos (hueso/piedra), negro y azul empolvado
        brand: {
          50: '#f2f5f7', 100: '#e3e9ee', 200: '#c9d4dd', 300: '#a5b6c4', 400: '#879bad',
          500: '#6b8093', 600: '#556879', 700: '#3f5062', 800: '#2b3542', 900: '#1f2731', 950: '#14191f',
        },
        bone: { 50: '#faf9f7', 100: '#f3f1ee', 200: '#e7e3de', 300: '#d8ccc2', 400: '#afadab' },
        ink: '#111111',
        wine: '#5b2a3a',
      },
      fontFamily: {
        sans: ['"Archivo Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
