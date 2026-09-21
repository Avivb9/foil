/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ember: {
          50: '#fff5ed',
          100: '#ffe7d4',
          200: '#ffcaa8',
          300: '#ffa571',
          400: '#fd7538',
          500: '#f45412',
          600: '#e53b08',
          700: '#bd2a09',
          800: '#96230f',
          900: '#791f10',
        },
        sand: {
          50: '#fbf9f6',
          100: '#f5f1ea',
          200: '#ebe4d8',
          300: '#dcd2c1',
          400: '#b9ab94',
          500: '#978a73',
          600: '#776b57',
          700: '#5a5143',
          800: '#3b352c',
          900: '#221e19',
          950: '#161310',
        },
      },
      boxShadow: {
        card: '0 1px 0 rgba(34,30,25,0.04), 0 1px 3px rgba(34,30,25,0.06)',
        lift: '0 8px 30px -8px rgba(34,30,25,0.18)',
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
