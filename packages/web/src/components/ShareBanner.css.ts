import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';

export const banner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${vars.space.sm} ${vars.space.lg}`,
  background: vars.color.accentDim,
  borderBottom: `1px solid ${vars.color.accent}`,
  borderLeft: `4px solid ${vars.color.accent}`,
  flexShrink: 0,
  gap: vars.space.md,
  flexWrap: 'wrap',
});

export const message = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  fontSize: '13px',
  flex: 1,
  minWidth: 0,
});

export const icon = style({
  fontSize: '16px',
  flexShrink: 0,
});

export const depList = style({
  fontFamily: vars.font.mono,
  fontSize: '12px',
  color: vars.color.accent,
  marginTop: '2px',
});

export const actions = style({
  display: 'flex',
  gap: '6px',
  flexShrink: 0,
});

export const acceptBtn = style({
  background: vars.color.accent,
  color: '#fff',
  border: 'none',
  fontWeight: 600,
  ':hover': { opacity: 0.9 },
});

export const dismissBtn = style({
  background: 'transparent',
  border: `1px solid ${vars.color.border}`,
});
