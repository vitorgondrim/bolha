/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        '3xl': '64px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-fast': 'float 4s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'neural-drift': 'neuralDrift 20s ease-in-out infinite',
        'breath': 'breath 4s ease-in-out infinite',
        'constellate': 'constellate 12s ease-in-out infinite',
        'signal-ping': 'signalPing 3s ease-in-out infinite',
        'gravity-drift': 'gravityDrift 15s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        neuralDrift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(12px, -16px) scale(1.02)' },
          '50%': { transform: 'translate(-8px, 8px) scale(0.98)' },
          '75%': { transform: 'translate(6px, -12px) scale(1.01)' },
        },
        breath: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
        constellate: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(15px, -20px)' },
          '66%': { transform: 'translate(-10px, 12px)' },
        },
        signalPing: {
          '0%': { boxShadow: '0 0 0 0 rgba(124, 58, 237, 0.4)' },
          '70%': { boxShadow: '0 0 0 8px rgba(124, 58, 237, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(124, 58, 237, 0)' },
        },
        gravityDrift: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-12px) rotate(0.5deg)' },
          '50%': { transform: 'translateY(-4px) rotate(-0.3deg)' },
          '75%': { transform: 'translateY(-18px) rotate(0.2deg)' },
        },
      },
    },
  },
  plugins: [],
}