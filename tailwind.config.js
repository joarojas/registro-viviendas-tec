/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        tec: {
          900: '#001b3a', // azul marino más oscuro (encabezado)
          800: '#002855', // azul marino institucional principal
          700: '#0b3b70',
          600: '#154f8f',
          100: '#e6ecf5',
        },
      },
    },
  },
  plugins: [],
};
