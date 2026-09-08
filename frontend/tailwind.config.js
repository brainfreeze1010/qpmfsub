export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // All colors point to CSS variables using the
        // `rgb(var(…) / <alpha-value>)` format so that
        // Tailwind opacity modifiers (e.g. /20, /40) keep working.
        surface: {
          DEFAULT:  'rgb(var(--surface-bg)        / <alpha-value>)',
          paper:    'rgb(var(--surface-paper)     / <alpha-value>)',
          border:   'rgb(var(--surface-border)    / <alpha-value>)',
          hover:    'rgb(var(--surface-hover)      / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated)  / <alpha-value>)',
        },
        ink: {
          DEFAULT:   'rgb(var(--ink)           / <alpha-value>)',
          secondary: 'rgb(var(--ink-secondary) / <alpha-value>)',
          muted:     'rgb(var(--ink-muted)     / <alpha-value>)',
          subtle:    'rgb(var(--ink-subtle)    / <alpha-value>)',
        },
        qp: {
          navy:          'rgb(var(--qp-navy)        / <alpha-value>)',
          'navy-dark':   'rgb(var(--qp-navy-dark)   / <alpha-value>)',
          'navy-light':  'rgb(var(--qp-navy-light)  / <alpha-value>)',
          'navy-50':     'rgb(var(--qp-navy-50)     / <alpha-value>)',
          'navy-100':    'rgb(var(--qp-navy-100)    / <alpha-value>)',
          green:         'rgb(var(--qp-green)       / <alpha-value>)',
          'green-dark':  'rgb(var(--qp-green-dark)  / <alpha-value>)',
          'green-50':    'rgb(var(--qp-green-50)    / <alpha-value>)',
          amber:         'rgb(var(--qp-amber)       / <alpha-value>)',
          'amber-50':    'rgb(var(--qp-amber-50)    / <alpha-value>)',
          red:           'rgb(var(--qp-red)         / <alpha-value>)',
          'red-50':      'rgb(var(--qp-red-50)      / <alpha-value>)',
          gold:          'rgb(var(--qp-gold)        / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ["'IBM Plex Sans'", 'system-ui', 'sans-serif'],
        body:    ["'IBM Plex Sans'", 'system-ui', 'sans-serif'],
        mono:    ["'IBM Plex Mono'", 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card:         '0 1px 3px 0 rgb(0 0 0 / var(--shadow-strength, 0.08)), 0 1px 2px -1px rgb(0 0 0 / var(--shadow-strength, 0.06))',
        panel:        '0 8px 32px 0 rgb(0 0 0 / var(--shadow-strength-lg, 0.18))',
        'card-hover': '0 4px 16px 0 rgb(0 0 0 / var(--shadow-strength, 0.12))',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
