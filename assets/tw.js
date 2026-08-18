/* Shared Tailwind theme for the Onsite app pages.
   Mirrors the inline config on the landing page so both feel like one product. */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        paper:        '#F7F6F3',
        surface:      '#FFFFFF',
        ink:          '#14161A',
        'ink-mid':    '#43484F',
        'ink-soft':   '#6E747C',
        line:         '#E3E1DC',
        'line-firm':  '#CFCCC5',
        accent:       '#1C2B3A',
        'accent-hi':  '#27394B',
        'accent-tint':'#EEF0F2'
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
