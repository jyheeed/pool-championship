/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        felt: { 50: '#f0fdf0', 100: '#d8f5d8', 200: '#b4e8b4', 400: '#4ade4a', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
        baize: '#1a6b35',
        wood: { 100: '#f5e6d3', 200: '#e8cba7', 300: '#d4a574', 400: '#c08552', 500: '#a06b3e', 600: '#7a5230', 700: '#5c3d24' },
        chalk: '#e8e0d0',
        slate: { 750: '#293548', 850: '#172033' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
