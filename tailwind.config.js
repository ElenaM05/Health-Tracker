/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      colors: {
        mint: {
          50:  '#f6fdf7',
          100: '#e3f9e5',
          200: '#c8efcb',
          300: '#a6e3a1',
          400: '#7fd87a',
          500: '#5fc96b',
          600: '#3fa34d',
          700: '#2d7a36',
          800: '#205527',
          900: '#13381a',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}