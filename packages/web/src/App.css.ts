import { style } from '@vanilla-extract/css';
import { vars } from './theme.css.js';

// ── Header ────────────────────────────────────────────────────────────────────

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `0 ${vars.space.lg}`,
  height: vars.height.header,
  background: vars.color.bgHeader,
  borderBottom: `1px solid ${vars.color.border}`,
  flexShrink: 0,
  gap: vars.space.sm,
});

export const appTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  fontWeight: 600,
  fontSize: '15px',
  whiteSpace: 'nowrap',
});

export const logo = style({
  color: vars.color.accent,
  fontSize: '18px',
});

export const subtitle = style({
  fontWeight: 400,
  color: vars.color.textMuted,
  fontSize: '13px',
  '@media': { '(max-width: 700px)': { display: 'none' } },
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
});

export const themeToggle = style({
  fontSize: '16px',
  padding: `${vars.space.xs} ${vars.space.sm}`,
  lineHeight: 1,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
});

export const githubLink = style({
  color: vars.color.textMuted,
  textDecoration: 'none',
  fontSize: '13px',
  padding: `${vars.space.xs} ${vars.space.sm}`,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.btnBorder}`,
  whiteSpace: 'nowrap',
  ':hover': {
    background: vars.color.btnHover,
    color: vars.color.text,
  },
  '@media': { '(max-width: 480px)': { display: 'none' } },
});

// ── Main panels ───────────────────────────────────────────────────────────────

export const appMain = style({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  position: 'relative',
  '@media': {
    '(max-width: 700px)': {
      flexDirection: 'column',
      overflow: 'hidden',
    },
  },
});

export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 0,
  minHeight: 0,
});

export const panelLabel = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${vars.space.xs} ${vars.space.sm}`,
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: vars.color.textMuted,
  background: vars.color.bgHeader,
  borderBottom: `1px solid ${vars.color.border}`,
  flexShrink: 0,
  gap: vars.space.sm,
  height: vars.height.labelBar,
});

export const shortcutHint = style({
  fontWeight: 400,
  textTransform: 'none',
  letterSpacing: 0,
  fontSize: '11px',
  opacity: 0.7,
  '@media': { '(max-width: 700px)': { display: 'none' } },
});

export const panelBody = style({
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
});

export const playerBody = style({
  flex: 1,
  minHeight: 0,
  background: '#000',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.space.md,
  overflow: 'auto',
});

// ── Resize handle ─────────────────────────────────────────────────────────────

export const resizeHandle = style({
  width: '5px',
  background: vars.color.border,
  cursor: 'col-resize',
  flexShrink: 0,
  transition: 'background 0.15s',
  position: 'relative',
  zIndex: 10,
  ':hover': { background: vars.color.accent },
  '@media': { '(max-width: 700px)': { display: 'none' } },
});

// ── Speed controls ────────────────────────────────────────────────────────────

export const speedControls = style({
  display: 'flex',
  gap: vars.space.xs,
});

export const speedBtn = style({
  padding: `2px 7px`,
  fontSize: '11px',
  borderRadius: vars.radius.sm,
  background: 'transparent',
  border: `1px solid ${vars.color.btnBorder}`,
  color: vars.color.textMuted,
  ':hover': {
    background: vars.color.btnHover,
    color: vars.color.text,
  },
});

export const speedBtnActive = style({
  background: vars.color.accent,
  borderColor: vars.color.accent,
  color: '#fff',
  ':hover': {
    background: vars.color.accent,
    color: '#fff',
  },
});
