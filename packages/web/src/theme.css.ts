import { createTheme, createGlobalStyle } from '@vanilla-extract/css';

// ── Typed theme contract ──────────────────────────────────────────────────────

export const [darkTheme, vars] = createTheme({
  color: {
    bg:          '#0d1117',
    bgPanel:     '#161b22',
    bgHeader:    '#1c2128',
    bgStatus:    '#1c2128',
    bgInput:     '#21262d',
    border:      '#30363d',
    text:        '#c9d1d9',
    textMuted:   '#6e7681',
    accent:      '#7c6af7',
    accentDim:   '#2d2563',
    ok:          '#3fb950',
    error:       '#f85149',
    btnBg:       '#21262d',
    btnHover:    '#30363d',
    btnBorder:   '#30363d',
  },
  font: {
    ui:   '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
  },
  height: {
    header:    '48px',
    labelBar:  '26px',
    statusBar: '36px',
  },
});

export const lightTheme = createTheme(vars, {
  color: {
    bg:          '#ffffff',
    bgPanel:     '#f6f8fa',
    bgHeader:    '#f6f8fa',
    bgStatus:    '#f6f8fa',
    bgInput:     '#ffffff',
    border:      '#d0d7de',
    text:        '#24292f',
    textMuted:   '#57606a',
    accent:      '#6e5fdb',
    accentDim:   '#ddd9f9',
    ok:          '#1a7f37',
    error:       '#cf222e',
    btnBg:       '#f6f8fa',
    btnHover:    '#eaeef2',
    btnBorder:   '#d0d7de',
  },
  font: {
    ui:   '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
  },
  height: {
    header:    '48px',
    labelBar:  '26px',
    statusBar: '36px',
  },
});
