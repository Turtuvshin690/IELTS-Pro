/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAFAF7',
        ink: '#18181B',
      },
      boxShadow: {
        card: '0 1px 2px rgb(24 24 27 / 0.05)',
      },
    },
  },
  plugins: []
};
