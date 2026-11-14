/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      // Tailwind silently ignores a class whose shade is not defined. The UI uses
      // full scales (e.g. text-danger-700, dark:bg-danger-950/20), so every custom
      // colour below defines the complete 50–950 range.
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // green scale
        healthy: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // amber scale
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // red scale
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // In-between greys used across the UI: exact midpoints of Tailwind's
        // neighbouring slate shades (e.g. 850 = halfway between 800 and 900).
        slate: {
          350: '#b0bccd',
          450: '#7c8ca2',
          550: '#56657a',
          650: '#3d4b5f',
          750: '#293548',
          850: '#172033',
        },
      },
      spacing: {
        4.5: '1.125rem',
        8.5: '2.125rem',
      },
      zIndex: {
        45: '45',
      },
      maxWidth: {
        '7.5xl': '88rem',
      },
    },
  },
  plugins: [],
}
