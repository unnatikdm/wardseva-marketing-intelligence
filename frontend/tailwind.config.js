/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0F19', // Premium dark navy
          panel: '#151D30', // Deep slate navy
          border: '#222F4C', // Subtle slate border
          text: '#F3F4F6', // Off white text
          muted: '#9CA3AF' // Gray muted
        },
        brand: {
          primary: '#0ea5e9', // Sky blue
          secondary: '#6366f1', // Indigo glow
          success: '#10b981', // Emerald green
          warning: '#f59e0b', // Amber yellow
          danger: '#ef4444', // Red alert
          purple: '#8b5cf6' // Purple accent
        }
      }
    }
  },
  plugins: []
};
