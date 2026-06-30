import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // existing brand cyan — kept for backwards compatibility
        quest: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#06b6d4',
          600: '#0891b2',
          900: '#164e63',
        },
        // Picasso "cozy-mystic voxel" palette (new names — never clobber Tailwind defaults)
        ink: {
          DEFAULT: '#0A0E1A',
          950: '#070A12',
          900: '#0A0E1A',
          850: '#0E1424',
          800: '#141B2E',
          700: '#1C2640',
          600: '#27314F',
        },
        glow: { DEFAULT: '#22D3EE', soft: '#5BE7F5', deep: '#0E97B8' }, // cyan — quest / on-chain
        gold: { DEFAULT: '#F5A623', soft: '#FFC857', deep: '#C77F12' }, // amber — reward / lantern
        bloom: { DEFAULT: '#E26FD0', soft: '#F0A6E4', deep: '#A84FC0' }, // magenta — mystic / blossom
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 48px -10px rgba(34,211,238,0.45)',
        'glow-gold': '0 0 48px -10px rgba(245,166,35,0.45)',
        card: '0 12px 40px -12px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        'glow-pulse': { '0%,100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        float: 'float 5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16,1,0.3,1)',
        smooth: 'cubic-bezier(0.25,0.4,0.25,1)',
      },
    },
  },
  plugins: [],
};

export default config;
