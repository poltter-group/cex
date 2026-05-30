export const colors = {
  // Brand
  primary:     '#F0A500',  // Gold/amber — main CTA
  primaryHover:'#D4920A',

  // Trading semantic
  buy:         '#26A69A',  // Teal green
  sell:        '#EF5350',  // Red

  // Light theme
  light: {
    bg:         '#FFFFFF',
    surface:    '#F8F9FA',
    surfaceAlt: '#F0F1F3',
    border:     '#E0E3E7',
    text:       '#0D0D0D',
    textMuted:  '#6B7280',
  },

  // Dark theme (Binance-style)
  dark: {
    bg:         '#0B0E11',
    surface:    '#161A1E',
    surfaceAlt: '#1E2329',
    border:     '#2A2D35',
    text:       '#EAEAEA',
    textMuted:  '#848E9C',
  },
} as const;
