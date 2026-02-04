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
        // Cinematic Theme - AI ANALYSIS Broadcast style
        cinematic: {
          primary: '#D4A843',
          'primary-light': '#F5D16C',
          secondary: '#12151C',
          accent: '#D4A843',
          bg: '#0B0D12',
          'bg-secondary': '#12151C',
          card: '#161A24',
          steel: '#8C95A8',
          'steel-light': '#B8C1D4',
          blue: '#4A9FD9',
          'blue-light': '#6CB8E8',
          amber: '#D9954A',
          'amber-light': '#E8B46C',
          red: '#D94A4A',
          green: '#4AD97A',
          yellow: '#D9B44A',
        },
        // Neon Theme - Modern tech style
        neon: {
          primary: '#00ff88',
          secondary: '#0d1117',
          accent: '#00d4ff',
          bg: '#0a0e14',
        },
        // Stadium Theme - Immersive atmosphere
        stadium: {
          primary: '#6366f1',
          secondary: '#1e1b4b',
          accent: '#818cf8',
          bg: '#0f0f23',
        },
        // Legacy colors
        gold: {
          DEFAULT: '#d4af37',
          light: '#f4d03f',
          dark: '#996515',
        },
      },
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        'space-grotesk': ['Space Grotesk', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
        'chakra': ['Chakra Petch', 'sans-serif'],
        'bebas': ['Bebas Neue', 'sans-serif'],
      },
      animation: {
        'flag-wave': 'flag-wave 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 8s linear infinite',
      },
      keyframes: {
        'flag-wave': {
          '0%, 100%': { transform: 'perspective(800px) rotateY(-3deg) skewY(1deg)' },
          '50%': { transform: 'perspective(800px) rotateY(3deg) skewY(-1deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
