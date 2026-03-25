/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        app: {
          page: 'var(--app-page)',
          surface: 'var(--app-surface)',
          card: 'var(--app-card)',
          'card-alt': 'var(--app-card-alt)',
          input: 'var(--app-input)',
          border: 'var(--app-border)',
          'border-strong': 'var(--app-border-strong)',
          text: 'var(--app-text)',
          muted: 'var(--app-muted)',
          faint: 'var(--app-faint)',
          accent: 'var(--app-accent)',
          'accent-dim': 'var(--app-accent-dim)',
          'on-accent': 'var(--app-on-accent)',
          danger: 'var(--app-danger)',
          'danger-bg': 'var(--app-danger-bg)',
          'danger-border': 'var(--app-danger-border)',
          warn: 'var(--app-warn)',
          'warn-bg': 'var(--app-warn-bg)',
          'warn-border': 'var(--app-warn-border)',
          success: 'var(--app-success)',
          'success-bg': 'var(--app-success-bg)',
          link: 'var(--app-link-decoration)',
        },
      },
    },
  },
  plugins: [],
};
