/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Recruitix Analytica Solution Brand Tokens
        ras: {
          teal: '#07566A',       // Deep Teal (headings, navigation, primary branding)
          'teal-dark': '#043845',
          'teal-light': '#0E6E87',
          green: '#00B96B',      // Primary Action Color (Emerald Green)
          'green-accent': '#00D98B', // Secondary Accent Color
          'green-dark': '#00B96B',
          'green-bright': '#00E99A', // Logo Bar Top
          mint: '#D5F5E7',       // Hover Background / Mint Tint
          'mint-soft': '#EAF8F3', // Soft Mint Main Background
          bg: '#EAF8F3',         // Main Application & Dashboard Background
          sidebar: '#F4FBF8',    // Sidebar Background
          navbar: '#F4FBF8',     // Header/Navbar Background
          hover: '#D5F5E7',      // Hover Background
          border: '#D8E9E2',     // Divider and Card Outlines
          sub: '#526B70',        // Secondary Text
          // Supporting accents (~5-10% visual weight)
          sky: '#38BDF8',
          'sky-soft': '#F0F9FF',
          violet: '#8B5CF6',
          'violet-soft': '#F5F3FF',
          amber: '#FBBF24',
          'amber-soft': '#FFFBEB',
          coral: '#FB7185',
          'coral-soft': '#FFF1F2',
        },
        brand: {
          50: '#EAF8F3',         // Soft Mint
          100: '#D5F5E7',        // Hover Mint
          200: '#B6FBE2',
          300: '#72F5C5',
          400: '#00D98B',        // Secondary Accent Green
          500: '#00B96B',        // Primary Action Green
          600: '#00B96B',        // Emerald Green
          700: '#0E6E87',
          800: '#07566A',        // Deep Teal
          900: '#043845',        // Dark Teal
          950: '#022129',
        },
        slate: {
          50: '#F4FBF8',         // Surface / Input Background
          100: '#EAF8F3',        // Soft Mint Alternate Surface
          150: '#E2F1EB',
          200: '#D8E9E2',        // Brand Border Gray
          300: '#CBD7DA',
          400: '#94A6AB',
          500: '#526B70',        // Secondary Text
          600: '#41575C',
          700: '#354A50',
          800: '#1E353B',
          850: '#13282D',
          900: '#07566A',        // Deep Teal primary headings & text
          950: '#043845',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 4px 20px -2px rgba(0, 217, 139, 0.35)',
        'glow-brand': '0 4px 18px 0 rgba(7, 86, 106, 0.22)',
        'glow-mint': '0 0 25px rgba(217, 255, 240, 0.8)',
        'glow-sky': '0 4px 18px 0 rgba(56, 189, 248, 0.25)',
        'glow-violet': '0 4px 18px 0 rgba(139, 92, 246, 0.25)',
        'glow-amber': '0 4px 18px 0 rgba(251, 191, 36, 0.25)',
        'glow-coral': '0 4px 18px 0 rgba(251, 113, 133, 0.25)',
        'card': '0 2px 10px rgba(7, 86, 106, 0.04), 0 1px 3px rgba(7, 86, 106, 0.02)',
        'card-hover': '0 14px 28px -6px rgba(7, 86, 106, 0.12), 0 4px 12px -2px rgba(0, 217, 139, 0.12)',
      },
      keyframes: {
        'bar-rise-1': {
          '0%': { transform: 'scaleY(0.3)', opacity: '0.6' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
          '100%': { transform: 'scaleY(0.3)', opacity: '0.6' },
        },
        'bar-rise-2': {
          '0%': { transform: 'scaleY(0.4)', opacity: '0.7' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
          '100%': { transform: 'scaleY(0.4)', opacity: '0.7' },
        },
        'bar-rise-3': {
          '0%': { transform: 'scaleY(0.5)', opacity: '0.8' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
          '100%': { transform: 'scaleY(0.5)', opacity: '0.8' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        }
      },
      animation: {
        'bar-1': 'bar-rise-1 1.6s ease-in-out infinite',
        'bar-2': 'bar-rise-2 1.6s ease-in-out infinite 0.2s',
        'bar-3': 'bar-rise-3 1.6s ease-in-out infinite 0.4s',
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
