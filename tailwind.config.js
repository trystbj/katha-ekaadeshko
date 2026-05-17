/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/**/*.{ts,tsx}',
    './web/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          gold: 'var(--studio-gold, #d4af37)',
          goldMuted: 'var(--studio-gold-muted, rgba(212, 175, 55, 0.45))',
          teal: 'var(--studio-teal, #0f2830)',
          glass: 'var(--studio-glass, rgba(15, 40, 48, 0.55))'
        }
      },
      boxShadow: {
        glow: '0 0 24px rgba(212, 175, 55, 0.22)'
      }
    }
  },
  plugins: []
}
