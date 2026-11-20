/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidad visual: papel blanco, azul de bolígrafo y el rosa de las burbujas de la hoja
        brand: {
          50: '#eff3ff', 100: '#dfe7ff', 200: '#c3d1ff', 300: '#9bb0fb', 400: '#6f88f1',
          500: '#4a66e3', 600: '#314bd0', 700: '#2439b0', 800: '#1f318d', 900: '#1c2c70', 950: '#121a43',
        },
        bone: { 50: '#ffffff', 100: '#f8f7f3', 200: '#ece9e1', 300: '#dbd6ca', 400: '#a7a297' },
        ink: '#14161b',
        rose: { 100: '#fde8ef', 300: '#f3a3bd', 500: '#d6336c', 700: '#a8204f' },
      },
      fontFamily: {
        sans: ['"Archivo Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['"Fraunces Variable"', 'Georgia', 'Cambria', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
