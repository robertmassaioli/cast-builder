import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';

export const container = style({
  background: vars.color.bgPanel,
  borderTop: `1px solid ${vars.color.border}`,
  padding: `${vars.space.sm} ${vars.space.lg}`,
  flexShrink: 0,
  maxHeight: '160px',
  overflowY: 'auto',
});

export const saveRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  marginBottom: vars.space.sm,
});

export const nameInput = style({
  flex: 1,
  background: vars.color.bgInput,
  color: vars.color.text,
  border: `1px solid ${vars.color.btnBorder}`,
  borderRadius: vars.radius.md,
  padding: `${vars.space.xs} ${vars.space.sm}`,
  fontSize: '12px',
  outline: 'none',
  fontFamily: vars.font.ui,
  ':focus': { borderColor: vars.color.accent },
});

export const saveError = style({
  color: vars.color.error,
  fontSize: '12px',
});

export const emptyMessage = style({
  color: vars.color.textMuted,
  fontSize: '12px',
});

export const slotList = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
});

export const slot = style({
  display: 'flex',
  alignItems: 'center',
  background: vars.color.bgInput,
  border: `1px solid ${vars.color.btnBorder}`,
  borderRadius: vars.radius.md,
  overflow: 'hidden',
});

export const loadBtn = style({
  border: 'none',
  borderRadius: 0,
  padding: `${vars.space.xs} ${vars.space.sm}`,
  fontSize: '12px',
  fontWeight: 500,
});

export const slotIconBtn = style({
  border: 'none',
  borderRadius: 0,
  borderLeft: `1px solid ${vars.color.btnBorder}`,
  padding: `${vars.space.xs} 6px`,
  fontSize: '12px',
});

export const dangerBtn = style({
  color: vars.color.error,
  ':hover': { background: 'rgba(248, 81, 73, 0.1)' },
});
