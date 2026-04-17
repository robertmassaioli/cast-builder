/**
 * Golden-file tests — compile each example .castscript with a fixed seed and
 * verify the output exactly matches the committed .cast fixture.
 *
 * To regenerate fixtures after intentional changes:
 *   for f in examples/hello-world examples/git-workflow examples/styled-output \
 *             examples/interactive examples/forge-deploy; do
 *     npx tsx src/index.ts compile "${f}.castscript" "${f}.cast" --seed 42 --overwrite
 *   done
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser.js';
import { compile } from '../../src/compiler/compiler.js';
import { encodeV3 } from '../../src/encoder/v3.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../');

/**
 * Strip the timestamp field from the header line so golden comparisons
 * are not affected by the wall-clock time at which the fixture was generated.
 */
function stripTimestamp(ndjson: string): string {
  // timestamp may appear as: ,"timestamp":NNN} or ,"timestamp":NNN,"next"
  return ndjson.replace(/,"timestamp":\d+/, '');
}

function compileExample(name: string): string {
  const scriptPath = resolve(ROOT, `examples/${name}.castscript`);
  const sourceDir = dirname(scriptPath);
  const src = readFileSync(scriptPath, 'utf8');
  const { config, nodes } = parse(src);
  // Fix seed for deterministic output
  config.typingSeed = 42;
  const compiled = compile(config, nodes, sourceDir);
  return stripTimestamp(encodeV3(compiled));
}

function golden(name: string): string {
  return stripTimestamp(readFileSync(resolve(ROOT, `examples/${name}.cast`), 'utf8'));
}

describe('golden fixtures', () => {
  it('hello-world', () => {
    expect(compileExample('hello-world')).toBe(golden('hello-world'));
  });

  it('git-workflow', () => {
    expect(compileExample('git-workflow')).toBe(golden('git-workflow'));
  });

  it('styled-output', () => {
    expect(compileExample('styled-output')).toBe(golden('styled-output'));
  });

  it('interactive', () => {
    expect(compileExample('interactive')).toBe(golden('interactive'));
  });

  it('forge-deploy', () => {
    expect(compileExample('forge-deploy')).toBe(golden('forge-deploy'));
  });
});
