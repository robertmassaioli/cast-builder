import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from '../theme.css.js';

export const overlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.65)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.space.lg,
  // Click outside to close
  backdropFilter: 'blur(2px)',
});

export const modal = style({
  background: vars.color.bgPanel,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  width: '100%',
  maxWidth: '760px',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
});

export const modalHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${vars.space.md} ${vars.space.lg}`,
  borderBottom: `1px solid ${vars.color.border}`,
  flexShrink: 0,
});

export const modalTitle = style({
  fontWeight: 600,
  fontSize: '15px',
  color: vars.color.text,
});

export const closeBtn = style({
  background: 'transparent',
  border: 'none',
  color: vars.color.textMuted,
  fontSize: '18px',
  lineHeight: 1,
  padding: `${vars.space.xs} ${vars.space.sm}`,
  cursor: 'pointer',
  borderRadius: vars.radius.sm,
  ':hover': {
    background: vars.color.btnHover,
    color: vars.color.text,
  },
});

export const modalBody = style({
  overflowY: 'auto',
  padding: `${vars.space.lg} ${vars.space.xl}`,
  flex: 1,
  lineHeight: 1.65,
  fontSize: '13px',
  color: vars.color.text,
});

// ── Markdown-like content styles ──────────────────────────────────────────────

globalStyle(`${modalBody} h2`, {
  fontSize: '16px',
  fontWeight: 700,
  color: vars.color.text,
  marginTop: vars.space.xl,
  marginBottom: vars.space.sm,
  paddingBottom: vars.space.xs,
  borderBottom: `1px solid ${vars.color.border}`,
});

globalStyle(`${modalBody} h3`, {
  fontSize: '13px',
  fontWeight: 700,
  color: vars.color.accent,
  marginTop: vars.space.lg,
  marginBottom: vars.space.xs,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

globalStyle(`${modalBody} p`, {
  marginBottom: vars.space.sm,
  color: vars.color.text,
});

globalStyle(`${modalBody} code`, {
  fontFamily: vars.font.mono,
  fontSize: '12px',
  background: vars.color.bgInput,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  padding: '1px 5px',
  color: vars.color.accent,
});

globalStyle(`${modalBody} pre`, {
  background: vars.color.bgInput,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: vars.space.md,
  overflowX: 'auto',
  marginBottom: vars.space.md,
  fontFamily: vars.font.mono,
  fontSize: '12px',
  lineHeight: 1.55,
  color: vars.color.text,
});

globalStyle(`${modalBody} pre code`, {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'inherit',
  fontSize: 'inherit',
});

globalStyle(`${modalBody} table`, {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: vars.space.md,
  fontSize: '12px',
});

globalStyle(`${modalBody} th`, {
  textAlign: 'left',
  padding: `${vars.space.xs} ${vars.space.sm}`,
  background: vars.color.bgHeader,
  color: vars.color.textMuted,
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: `1px solid ${vars.color.border}`,
});

globalStyle(`${modalBody} td`, {
  padding: `${vars.space.xs} ${vars.space.sm}`,
  borderBottom: `1px solid ${vars.color.border}`,
  verticalAlign: 'top',
});

globalStyle(`${modalBody} td:first-child code`, {
  whiteSpace: 'nowrap',
});

globalStyle(`${modalBody} strong`, {
  fontWeight: 600,
  color: vars.color.text,
});

globalStyle(`${modalBody} ul`, {
  paddingLeft: vars.space.lg,
  marginBottom: vars.space.sm,
});

globalStyle(`${modalBody} li`, {
  marginBottom: vars.space.xs,
});
