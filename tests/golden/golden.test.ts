/**
 * Golden-file tests — compile each example .castscript and verify the output
 * matches the committed .cast fixture.
 *
 * Phase 0: skeleton only (no examples have golden fixtures yet — they will be
 * added when Phase 1 compilation is complete). This test file is intentionally
 * empty of test cases so the suite stays green from day one.
 *
 * To add a golden test once a fixture is ready:
 *
 *   import { readFileSync } from 'node:fs';
 *   import { parse } from '../../src/parser/parser.js';
 *   import { compile } from '../../src/compiler/compiler.js';
 *   import { encodeV3 } from '../../src/encoder/v3.js';
 *
 *   it('hello-world golden', () => {
 *     const src = readFileSync('examples/hello-world.castscript', 'utf8');
 *     const { config, nodes } = parse(src);
 *     const output = encodeV3(compile(config, nodes));
 *     const golden = readFileSync('examples/hello-world.cast', 'utf8');
 *     expect(output).toBe(golden);
 *   });
 */

import { describe, it } from 'vitest';

describe('golden fixtures', () => {
  it.todo('hello-world golden fixture');
  it.todo('git-workflow golden fixture');
  it.todo('styled-output golden fixture');
  it.todo('interactive golden fixture');
  it.todo('forge-deploy golden fixture');
});
