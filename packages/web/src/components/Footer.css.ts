import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';

export const footer = style({
  flexShrink: 0,
  borderTop: `1px solid ${vars.color.border}`,
});

export const savedPanel = style({
  background: vars.color.bgPanel,
  borderTop: `1px solid ${vars.color.border}`,
  padding: `${vars.space.sm} ${vars.space.lg}`,
  maxHeight: '160px',
  overflowY: 'auto',
});
