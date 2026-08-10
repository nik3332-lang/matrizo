/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Matrizo brand palette — carried over from the original coming-soon page
        cream: '#FAF3E8',
        purple: {
          DEFAULT: '#6B21A8',
          dark: '#3B0764',
        },
        orange: {
          DEFAULT: '#E8450A',
          light: '#F97316',
        },
        yellow: {
          DEFAULT: '#FBBF24',
        },
        ink: {
          DEFAULT: '#1A1A2E',
          body: '#3D3D5C',
        },
        whatsapp: '#25D366',
      },
    },
  },
  plugins: [],
};
