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
        // EPL-inspired dark theme
        primary: {
          DEFAULT: '#38003c', // EPL purple
          light: '#5c0066',
          dark: '#1a001d',
        },
        accent: {
          DEFAULT: '#00ff85', // EPL green
          light: '#33ff9e',
          dark: '#00cc6a',
        },
        fire: {
          DEFAULT: '#ff4500',
          light: '#ff6b35',
          dark: '#cc3700',
        },
      },
      animation: {
        'fall': 'fall 3s ease-in-out forwards',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-glow': 'pulse-glow 2s infinite',
        'slide-left': 'slide-left 1s ease-out forwards',
        'slide-right': 'slide-right 1s ease-out forwards',
      },
      keyframes: {
        fall: {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { transform: 'translateY(0) rotate(720deg)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 133, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 255, 133, 0.8)' },
        },
        'slide-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
