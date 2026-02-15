/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['var(--font-poppins)', 'sans-serif'],
      },
      colors: {
        wine: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0d9',
          300: '#f4a8b8',
          400: '#ed7691',
          500: '#e14d6e',
          600: '#cc2f56',
          700: '#ab2346',
          800: '#8f2040',
          900: '#7a1f3b',
          950: '#4a0a1f', // Added 950 for darker login background
        },
      },
    },
  },
  plugins: [],
}
