// Same Matrizo brand palette as apps/web and apps/admin (see
// apps/web/src/app/globals.css's @theme block) — kept in sync by hand
// across all three since NativeWind (Tailwind v3 config format here,
// unlike the v4 CSS-based config the other two apps use) can't share a
// config package easily.
const brandOrange = {
  50: '#fff3ea',
  100: '#ffe1cc',
  200: '#ffc299',
  300: '#ffa35f',
  400: '#fe8a3d',
  500: '#fd7210',
  600: '#e75924',
  700: '#ef3d21',
  800: '#c22f16',
  900: '#9c2510',
};

const brandPurple = {
  50: '#f6eef9',
  100: '#ebd9f0',
  200: '#d3b0de',
  300: '#b885cb',
  400: '#9c5fb2',
  500: '#85469b',
  600: '#65346c',
  700: '#582463',
  800: '#4e1775',
  900: '#3a0f5a',
};

const brandCoral = {
  50: '#fdf3f0',
  100: '#fae2dc',
  200: '#f4c6bb',
  300: '#efac9e',
  400: '#e99e8b',
  500: '#dc7e68',
  600: '#c75f47',
  700: '#a8452f',
  800: '#85331f',
  900: '#642514',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'brand-orange': brandOrange,
        'brand-purple': brandPurple,
        'brand-coral': brandCoral,
        'brand-cream': '#f4eae0',
      },
    },
  },
  plugins: [],
};
