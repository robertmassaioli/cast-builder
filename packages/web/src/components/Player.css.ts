import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';

export const placeholder = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
});

export const placeholderInner = style({
  textAlign: 'center',
  color: vars.color.textMuted,
});

export const placeholderIcon = style({
  fontSize: '48px',
  color: vars.color.accent,
  opacity: 0.4,
  display: 'block',
  marginBottom: vars.space.md,
});

export const placeholderText = style({
  fontSize: '13px',
  marginTop: vars.space.xs,
});

export const playerContainer = style({
  width: '100%',
});
