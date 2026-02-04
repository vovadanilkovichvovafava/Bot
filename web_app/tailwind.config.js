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
        // Stadium Theme - AI Analysis Center (Style 3)
        stadium: {
          primary: '#4A7AFF',
          'primary-light': '#6A94FF',
          secondary: '#10141E',
          accent: '#E0E8FF',
          bg: '#080A10',
          'bg-secondary': '#10141E',
          card: '#10141E',
          glass: 'rgba(12, 15, 24, 0.85)',
          blue: '#4A7AFF',
          green: '#3DDC84',
          red: '#FF3B3B',
          'red-orange': '#FF5A5A',
          orange: '#FF7A4A',
          purple: '#9D6AFF',
          text: '#FFFFFF',
          'text-secondary': '#BFC7D9',
          'text-muted': '#6E7891',
          'nav-active': '#FFFFFF',
          'nav-inactive': '#A0A8BE',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-blue': 'rgba(74, 122, 255, 0.5)',
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
        'montserrat': ['Montserrat', 'sans-serif'],
        'unbounded': ['Unbounded', 'sans-serif'],
      },
      animation: {
        'flag-wave': 'flag-wave 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 8s linear infinite',
        'flag-swing': 'flag-swing 5s ease-in-out infinite alternate',
        'count-up': 'count-up 1.2s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'live-pulse': 'live-pulse 1s ease-in-out infinite',
      },
      keyframes: {
        'flag-wave': {
          '0%, 100%': { transform: 'perspective(800px) rotateY(-3deg) skewY(1deg)' },
          '50%': { transform: 'perspective(800px) rotateY(3deg) skewY(-1deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(74, 122, 255, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(74, 122, 255, 0.4)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'flag-swing': {
          '0%, 100%': { transform: 'rotate(-0.5deg)' },
          '50%': { transform: 'rotate(0.5deg)' },
        },
        'count-up': {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'live-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.7' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'stadium-overlay': 'linear-gradient(180deg, rgba(8,10,16,0.55) 0%, rgba(8,10,16,0.85) 60%, #080A10 100%)',
      },
      backdropBlur: {
        'glass': '16px',
      },
    },
  },
  plugins: [],
};
