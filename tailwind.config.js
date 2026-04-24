export default {
  content: ['./index.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070912',
          900: '#0a0e1a',
          800: '#121826',
          700: '#1c2333',
          600: '#2a3347'
        },
        bone: {
          50: '#fafaf5',
          100: '#f4f3e9',
          200: '#e8e5d0',
          300: '#ccc7a9'
        },
        accent: {
          amber: '#f59e0b',
          gold: '#eab308',
          rust: '#c2410c',
          copper: '#b45309'
        },
        ok: '#16a34a',
        warn: '#f59e0b',
        err: '#dc2626'
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } }
      }
    }
  },
  plugins: []
};
