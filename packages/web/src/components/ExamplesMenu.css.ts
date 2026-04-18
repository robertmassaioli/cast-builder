import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';

export const menu = style({
  position: 'relative',
});

export const trigger = style({
  padding: `${vars.space.xs} ${vars.space.sm}`,
  fontSize: '13px',
});

export const dropdown = style({
  position: 'absolute',
  top: 'calc(100% + 4px)',
  right: 0,
  background: vars.color.bgPanel,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  minWidth: '240px',
  zIndex: 200,
  overflow: 'hidden',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
});

export const item = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  width: '100%',
  border: 'none',
  borderRadius: 0,
  borderBottom: `1px solid ${vars.color.border}`,
  padding: `${vars.space.sm} 14px`,
  textAlign: 'left',
  background: 'transparent',
  gap: '2px',
  ':last-child': { borderBottom: 'none' },
  ':hover': { background: vars.color.btnHover },
});

export const itemName = style({
  fontWeight: 600,
  fontSize: '13px',
});

export const itemDesc = style({
  color: vars.color.textMuted,
  fontSize: '11px',
});
