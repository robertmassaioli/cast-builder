import { describe, it, expect } from 'vitest';
import { encodeV3 } from '../../src/encoder/v3.js';
import type { CompiledCast } from '../../src/compiler/types.js';

describe('encodeV3', () => {
  const minimal: CompiledCast = {
    header: { version: 3, cols: 80, rows: 24 },
    events: [],
  };

  it('produces valid NDJSON (each line parseable)', () => {
    const output = encodeV3(minimal);
    const lines = output.trim().split('\n');
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('first line is the header with correct version', () => {
    const output = encodeV3(minimal);
    const header = JSON.parse(output.split('\n')[0] ?? '{}') as Record<string, unknown>;
    expect(header['version']).toBe(3);
    expect(header['width']).toBe(80);
    expect(header['height']).toBe(24);
  });

  it('converts absolute times to deltas', () => {
    const cast: CompiledCast = {
      header: { version: 3, cols: 80, rows: 24 },
      events: [
        { time: 1.0, code: 'o', data: 'a' },
        { time: 2.5, code: 'o', data: 'b' },
        { time: 3.0, code: 'o', data: 'c' },
      ],
    };
    const lines = encodeV3(cast).trim().split('\n');
    // Skip header (line 0)
    const e1 = JSON.parse(lines[1] ?? '[]') as [number, string, string];
    const e2 = JSON.parse(lines[2] ?? '[]') as [number, string, string];
    const e3 = JSON.parse(lines[3] ?? '[]') as [number, string, string];

    expect(e1[0]).toBeCloseTo(1.0);   // delta from 0
    expect(e2[0]).toBeCloseTo(1.5);   // delta from 1.0 → 2.5
    expect(e3[0]).toBeCloseTo(0.5);   // delta from 2.5 → 3.0
  });

  it('includes optional header fields when present', () => {
    const cast: CompiledCast = {
      header: { version: 3, cols: 80, rows: 24, title: 'Test', timestamp: 1000 },
      events: [],
    };
    const header = JSON.parse(encodeV3(cast).split('\n')[0] ?? '{}') as Record<string, unknown>;
    expect(header['title']).toBe('Test');
    expect(header['timestamp']).toBe(1000);
  });

  it('ends with a trailing newline', () => {
    const output = encodeV3(minimal);
    expect(output.endsWith('\n')).toBe(true);
  });
});
