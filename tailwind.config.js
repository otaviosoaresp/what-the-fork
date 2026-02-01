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
        background: '#0f172a',
        foreground: '#e2e8f0',
        muted: '#334155',
        'muted-foreground': '#94a3b8',
        border: 'rgba(255, 255, 255, 0.08)',
        'border-subtle': 'rgba(255, 255, 255, 0.05)',
        accent: '#3b82f6',
        'accent-foreground': '#ffffff',
        destructive: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
      }
    },
  },
  plugins: [],
}
