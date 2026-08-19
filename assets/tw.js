/* Shared Tailwind theme for the Onsite app pages.
   Colours resolve through the tokens in theme.css so light and dark
   both flow from one place. */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        paper:        'rgb(var(--c-paper) / <alpha-value>)',
        surface:      'rgb(var(--c-surface) / <alpha-value>)',
        ink:          'rgb(var(--c-ink) / <alpha-value>)',
        'ink-mid':    'rgb(var(--c-ink-mid) / <alpha-value>)',
        'ink-soft':   'rgb(var(--c-ink-soft) / <alpha-value>)',
        line:         'rgb(var(--c-line) / <alpha-value>)',
        'line-firm':  'rgb(var(--c-line-firm) / <alpha-value>)',
        accent:       'rgb(var(--c-accent) / <alpha-value>)',
        'accent-hi':  'rgb(var(--c-accent-hi) / <alpha-value>)',
        'accent-tint':'rgb(var(--c-accent-tint) / <alpha-value>)'
      },
      fontFamily: {
        display: ['Archivo', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans:    ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      maxWidth: { shell: '76rem', prose: '38rem' }
    }
  }
};
