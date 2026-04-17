import { describe, it, expect } from 'vitest';
import { modifiersToAnsi, RESET, CLEAR_SCREEN } from '../../src/util/ansi.js';

describe('modifiersToAnsi', () => {
  it('returns empty string for empty modifiers', () => {
    expect(modifiersToAnsi([])).toBe('');
  });

  it('returns bold escape', () => {
    expect(modifiersToAnsi(['bold'])).toBe('\x1b[1m');
  });

  it('returns green foreground escape', () => {
    expect(modifiersToAnsi(['green'])).toBe('\x1b[32m');
  });

  it('returns combined bold+green', () => {
    expect(modifiersToAnsi(['bold', 'green'])).toBe('\x1b[1;32m');
  });

  it('returns red background', () => {
    expect(modifiersToAnsi(['bg-red'])).toBe('\x1b[41m');
  });

  it('handles hex colour (24-bit)', () => {
    // #ff6600 → r=255, g=102, b=0
    expect(modifiersToAnsi(['#ff6600'])).toBe('\x1b[38;2;255;102;0m');
  });

  it('ignores unknown modifiers gracefully', () => {
    expect(modifiersToAnsi(['unknown-modifier'])).toBe('');
  });
});

describe('constants', () => {
  it('RESET is the SGR 0 sequence', () => {
    expect(RESET).toBe('\x1b[0m');
  });

  it('CLEAR_SCREEN contains erase and home sequences', () => {
    expect(CLEAR_SCREEN).toContain('\x1b[2J');
    expect(CLEAR_SCREEN).toContain('\x1b[H');
  });
});
