/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366EF',
          50: '#F5F5FF',
          100: '#EBEBFF',
          200: '#D6D6FF',
          300: '#B8B9FF',
          400: '#9A9CFF',
          500: '#6366EF',  // Main brand color
          600: '#4B4DD4',
          700: '#3657BF',  // PDF/Dark variant
          800: '#2A3E94',
          900: '#1F2E6B',
        },
        accent: {
          DEFAULT: '#22C55E',
          500: '#22C55E',
          600: '#16A34A',
        },
        success: {
          DEFAULT: '#10B981',
          500: '#10B981',
        },
        warning: {
          DEFAULT: '#F59E0B',
          500: '#F59E0B',
        },
        error: {
          DEFAULT: '#EF4444',
          500: '#EF4444',
        },
      },
      fontFamily: {
        arabic: ['Tajawal', 'IBM Plex Sans Arabic', 'Noto Sans Arabic', 'sans-serif'],
        latin: ['Poppins', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6366EF 0%, #3657BF 100%)',
      },
    },
  },
  plugins: [],
};
