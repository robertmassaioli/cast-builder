/**
 * Golden-file tests — compile each example .castscript with a fixed seed and
 * now:0 and verify the output exactly matches the committed .cast fixture.
 *
 * To regenerate fixtures after intentional changes run:
 *   cd packages/core
 *   node --import tsx/esm scripts/regen-golden.ts   (or use the npm script below)
 *
 * Quick regen via CLI (from monorepo root):
 *   for f in hello-world git-workflow styled-output interactive forge-deploy; do
 *     node packages/cli/dist/index.js compile \
 *       packages/core/examples/${f}.castscript \
 *       packages/core/examples/${f}.cast \
 *       --seed 42 --overwrite
 *   done
 *   # Then set timestamp to 0 in each .cast header manually, or use --timestamp 0
 *   # once that flag is added to the CLI.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser.js';
import { compile } from '../../src/compiler/compiler.js';
import { encodeV3 } from '../../src/encoder/v3.js';
import { FileResolverErrorCode } from '../../src/compiler/types.js';
import type { FileResolverResult } from '../../src/compiler/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLES = resolve(__dirname, '../../examples');

/**
 * A Node.js-style resolver scoped to the examples directory.
 * We inline it here rather than importing from packages/cli to keep core tests
 * free of CLI dependencies.
 */
function createExamplesResolver(baseDir: string) {
  return (path: string): FileResolverResult => {
    const fullPath = resolve(baseDir, path);
    try {
      const content = readFileSync(fullPath, 'utf8');
      return { ok: true, content };
    } catch {
      return {
        ok: false,
        code: FileResolverErrorCode.NotFound,
        message: `File not found: ${fullPath}`,
        path,
      };
    }
  };
}

async function compileExample(name: string): Promise<string> {
  const scriptPath = resolve(EXAMPLES, `${name}.castscript`);
  const scriptDir = dirname(scriptPath);
  const src = readFileSync(scriptPath, 'utf8');
  const { config, nodes } = parse(src);
  config.typingSeed = 42;
  const compiled = await compile(config, nodes, {
    resolver: createExamplesResolver(scriptDir),
    now: 0, // deterministic timestamp — no stripping needed
  });
  return encodeV3(compiled);
}

function golden(name: string): string {
  return readFileSync(resolve(EXAMPLES, `${name}.cast`), 'utf8');
}

describe('golden fixtures', () => {
  it('hello-world', async () => {
    expect(await compileExample('hello-world')).toBe(golden('hello-world'));
  });

  it('git-workflow', async () => {
    expect(await compileExample('git-workflow')).toBe(golden('git-workflow'));
  });

  it('styled-output', async () => {
    expect(await compileExample('styled-output')).toBe(golden('styled-output'));
  });

  it('interactive', async () => {
    expect(await compileExample('interactive')).toBe(golden('interactive'));
  });

  it('forge-deploy', async () => {
    expect(await compileExample('forge-deploy')).toBe(golden('forge-deploy'));
  });
});
