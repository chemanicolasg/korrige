/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff', 100: '#dbe6ff', 200: '#bfd2ff', 300: '#93b2ff', 400: '#6088fb',
          500: '#3b63f3', 600: '#2546e0', 700: '#1d36bd', 800: '#1c3096', 900: '#1b2d75', 950: '#131c47',
        },
        ink: '#0f172a',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
