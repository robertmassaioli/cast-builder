import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';

export const statusBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `6px ${vars.space.lg}`,
  background: vars.color.bgStatus,
  borderTop: `1px solid ${vars.color.border}`,
  flexShrink: 0,
  gap: vars.space.md,
  flexWrap: 'wrap',
  minHeight: vars.height.statusBar,
  '@media': {
    '(max-width: 480px)': { padding: `6px ${vars.space.sm}` },
  },
});

export const statusNeutral = style({ });
export const statusOk = style({ });
export const statusError = style({ });

export const statusText = style({
  fontSize: '12px',
  fontFamily: vars.font.mono,
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  selectors: {
    [`${statusOk} &`]: { color: vars.color.ok },
    [`${statusError} &`]: { color: vars.color.error },
    [`${statusNeutral} &`]: { color: vars.color.textMuted },
  },
});

export const statusActions = style({
  display: 'flex',
  gap: '6px',
  flexShrink: 0,
  flexWrap: 'wrap',
});
