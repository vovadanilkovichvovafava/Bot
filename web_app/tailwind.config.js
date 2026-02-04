/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // EPL 2007-2015 Golden Era Theme
        gold: {
          DEFAULT: '#d4af37',
          light: '#f4d03f',
          dark: '#996515',
        },
        purple: {
          deep: '#1a0a2e',
          mid: '#2d1b4e',
          light: '#3d1a5c',
        },
        epl: {
          red: '#e90052',
          dark: '#0d0d14',
        },
      },
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
      animation: {
        'flag-wave': 'flag-wave 6s ease-in-out infinite',
        'pulse-gold': 'pulse-gold 2s infinite',
      },
      keyframes: {
        'flag-wave': {
          '0%, 100%': { transform: 'perspective(800px) rotateY(-3deg) skewY(1deg)' },
          '50%': { transform: 'perspective(800px) rotateY(3deg) skewY(-1deg)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 175, 55, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
