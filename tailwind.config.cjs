/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text',
          'Helvetica Neue', 'PingFang SC', 'Microsoft Yahei', 'sans-serif',
        ],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        mac: {
          bg: 'rgba(30, 30, 32, 0.72)',
          panel: 'rgba(40, 40, 44, 0.78)',
          border: 'rgba(255,255,255,0.08)',
          text: '#e6e6e8',
          subtle: '#9a9aa3',
          accent: '#0a84ff',
          accent2: '#5e5ce6',
          green: '#30d158',
          red: '#ff453a',
          yellow: '#ffd60a',
        },
      },
      boxShadow: {
        glass: '0 10px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backdropBlur: {
        mac: '24px',
      },
      borderRadius: {
        mac: '12px',
      },
    },
  },
  plugins: [],
};
