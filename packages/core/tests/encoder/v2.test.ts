import { describe, it, expect } from 'vitest';
import { encodeV2 } from '../../src/encoder/v2.js';
import type { CompiledCast } from '../../src/compiler/types.js';

describe('encodeV2', () => {
  const minimal: CompiledCast = {
    header: { version: 2, cols: 80, rows: 24 },
    events: [],
  };

  it('produces valid NDJSON (each line parseable)', () => {
    const output = encodeV2(minimal);
    const lines = output.trim().split('\n');
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('first line is the header with version 2', () => {
    const output = encodeV2(minimal);
    const header = JSON.parse(output.split('\n')[0] ?? '{}') as Record<string, unknown>;
    expect(header['version']).toBe(2);
    expect(header['width']).toBe(80);
    expect(header['height']).toBe(24);
  });

  it('uses absolute timestamps (not deltas)', () => {
    const cast: CompiledCast = {
      header: { version: 2, cols: 80, rows: 24 },
      events: [
        { time: 1.0, code: 'o', data: 'a' },
        { time: 2.5, code: 'o', data: 'b' },
        { time: 3.0, code: 'o', data: 'c' },
      ],
    };
    const lines = encodeV2(cast).trim().split('\n');
    const e1 = JSON.parse(lines[1] ?? '[]') as [number, string, string];
    const e2 = JSON.parse(lines[2] ?? '[]') as [number, string, string];
    const e3 = JSON.parse(lines[3] ?? '[]') as [number, string, string];

    // v2: absolute times preserved
    expect(e1[0]).toBeCloseTo(1.0);
    expect(e2[0]).toBeCloseTo(2.5);
    expect(e3[0]).toBeCloseTo(3.0);
  });

  it('ends with a trailing newline', () => {
    expect(encodeV2(minimal).endsWith('\n')).toBe(true);
  });

  it('includes optional header fields', () => {
    const cast: CompiledCast = {
      header: { version: 2, cols: 80, rows: 24, title: 'Test v2', timestamp: 999 },
      events: [],
    };
    const header = JSON.parse(encodeV2(cast).split('\n')[0] ?? '{}') as Record<string, unknown>;
    expect(header['title']).toBe('Test v2');
    expect(header['timestamp']).toBe(999);
  });

  it('marker events are encoded as [time, "m", label]', () => {
    const cast: CompiledCast = {
      header: { version: 2, cols: 80, rows: 24 },
      events: [{ time: 5.0, code: 'm', data: 'Step 1' }],
    };
    const lines = encodeV2(cast).trim().split('\n');
    const ev = JSON.parse(lines[1] ?? '[]') as [number, string, string];
    expect(ev[1]).toBe('m');
    expect(ev[2]).toBe('Step 1');
  });
});
