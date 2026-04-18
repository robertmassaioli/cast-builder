import { globalStyle, globalFontFace } from '@vanilla-extract/css';
import { vars } from './theme.css.js';

// ── Reset ─────────────────────────────────────────────────────────────────────
globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0,
});

globalStyle('body', {
  background: vars.color.bg,
  color: vars.color.text,
  height: '100dvh',
  overflow: 'hidden',
  fontFamily: vars.font.ui,
  fontSize: '14px',
});

globalStyle('#app', {
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

// ── Global button reset ───────────────────────────────────────────────────────
globalStyle('button', {
  background: vars.color.btnBg,
  color: vars.color.text,
  border: `1px solid ${vars.color.btnBorder}`,
  borderRadius: vars.radius.md,
  padding: `${vars.space.xs} ${vars.space.sm}`,
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'background 0.1s',
  fontFamily: vars.font.ui,
});

globalStyle('button:hover:not(:disabled)', {
  background: vars.color.btnHover,
});

globalStyle('button:disabled', {
  opacity: 0.4,
  cursor: 'not-allowed',
});
