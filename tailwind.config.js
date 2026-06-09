/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        cosmos: {
          900: '#0A0E1A',
          800: '#0F1629',
          700: '#151D36',
          600: '#1E293B',
          500: '#2D3A52',
        },
        nebula: {
          500: '#7C3AED',
          400: '#8B5CF6',
          300: '#A78BFA',
        },
        plasma: {
          500: '#F97316',
          400: '#FB923C',
          300: '#FDBA74',
        },
        aurora: {
          500: '#10B981',
          400: '#34D399',
          300: '#6EE7B7',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        noto: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'stagger-1': 'slideUp 0.5s ease-out 0.1s both',
        'stagger-2': 'slideUp 0.5s ease-out 0.2s both',
        'stagger-3': 'slideUp 0.5s ease-out 0.3s both',
        'stagger-4': 'slideUp 0.5s ease-out 0.4s both',
        'red-flash': 'redFlash 1s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(124, 58, 237, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.6), 0 0 40px rgba(124, 58, 237, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        redFlash: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(239, 68, 68, 0.3)' },
          '50%': { boxShadow: '0 0 15px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.3)' },
        },
      },
    },
  },
  plugins: [],
};
