/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        // Paleta "Azul Horizonte / Profesional"
        brand: {
          50: '#F2F8FE',
          100: '#E7F1FB', // contenedores / filas seleccionadas
          200: '#CFE3F7',
          300: '#A8CBEF',
          400: '#7FB2E4',
          500: '#4A90D9',
          600: '#3A82CF',
          700: '#2F78C8', // azul cobalto / CTA
          800: '#245E9E',
          900: '#173A5E', // azul marino (estructura)
        },
        // Neutro dominante y color de texto principal
        canvas: '#F6FBF9',
        ink: '#173A5E',
      },
    },
  },
  plugins: [],
}
