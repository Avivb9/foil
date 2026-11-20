/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ember: {
          50: '#eef3ff',
          100: '#dbe5ff',
          200: '#bfd0ff',
          300: '#93b1ff',
          400: '#6088ff',
          500: '#3b63f6',
          600: '#2748e0',
          700: '#1f38b8',
          800: '#1f3394',
          900: '#1e2f75',
        },
        sand: {
          50: '#f8f9fb',
          100: '#f1f3f6',
          200: '#e4e7ec',
          300: '#d0d5dd',
          400: '#98a2b3',
          500: '#667085',
          600: '#475467',
          700: '#344054',
          800: '#1d2939',
          900: '#101828',
          950: '#0b111d',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.05)',
        lift: '0 12px 32px -8px rgba(16,24,40,0.16), 0 4px 8px -4px rgba(16,24,40,0.06)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        shimmer: 'shimmer 1.4s infinite',
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
};
