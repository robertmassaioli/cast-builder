import { describe, it, expect } from 'vitest';
import { TimingEngine } from '../../src/compiler/timing.js';

describe('TimingEngine', () => {
  it('starts at zero', () => {
    const engine = new TimingEngine('normal', 42);
    expect(engine.seconds).toBe(0);
  });

  it('advances clock by fixed ms', () => {
    const engine = new TimingEngine('instant', 1);
    engine.advance(1000);
    expect(engine.seconds).toBe(1);
    engine.advance(500);
    expect(engine.seconds).toBe(1.5);
  });

  it('typeChar advances clock (instant speed = 0ms)', () => {
    const engine = new TimingEngine('instant', 1);
    const before = engine.seconds;
    engine.typeChar();
    expect(engine.seconds).toBe(before); // instant = no delay
  });

  it('typeChar advances clock (normal speed > 0ms)', () => {
    const engine = new TimingEngine('normal', 42);
    const before = engine.seconds;
    engine.typeChar();
    expect(engine.seconds).toBeGreaterThan(before);
  });

  it('emitLine advances clock', () => {
    const engine = new TimingEngine('normal', 1);
    const before = engine.seconds;
    engine.emitLine(0);
    expect(engine.seconds).toBeGreaterThan(before);
  });

  it('is deterministic with the same seed', () => {
    const e1 = new TimingEngine('normal', 99);
    const e2 = new TimingEngine('normal', 99);
    for (let i = 0; i < 10; i++) {
      e1.typeChar();
      e2.typeChar();
    }
    expect(e1.seconds).toBe(e2.seconds);
  });

  it('produces different output with different seeds', () => {
    const e1 = new TimingEngine('normal', 1);
    const e2 = new TimingEngine('normal', 2);
    for (let i = 0; i < 20; i++) {
      e1.typeChar();
      e2.typeChar();
    }
    expect(e1.seconds).not.toBe(e2.seconds);
  });

  it('setSpeed changes the profile', () => {
    const engine = new TimingEngine('instant', 1);
    engine.setSpeed('normal');
    const before = engine.seconds;
    engine.typeChar();
    expect(engine.seconds).toBeGreaterThan(before);
  });
});
