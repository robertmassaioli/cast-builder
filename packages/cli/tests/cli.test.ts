/**
 * CLI integration tests — spawn `node dist/index.js` as a subprocess
 * to verify the CLI wiring works end-to-end after `npm run build`.
 *
 * These tests require `npm run build` to have been run first in packages/cli.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, '../dist/index.js');

function run(...args: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
  };
}

describe('CLI — help', () => {
  it('shows help with --help', () => {
    const { stdout, status } = run('--help');
    expect(status).toBe(0);
    expect(stdout).toContain('cast-builder');
    expect(stdout).toContain('compile');
    expect(stdout).toContain('validate');
    expect(stdout).toContain('decompile');
    expect(stdout).toContain('init');
    expect(stdout).toContain('preview');
  });

  it('compile --help shows options', () => {
    const { stdout, status } = run('compile', '--help');
    expect(status).toBe(0);
    expect(stdout).toContain('--format');
    expect(stdout).toContain('--seed');
    expect(stdout).toContain('--overwrite');
  });
});

describe('CLI — validate', () => {
  const EXAMPLE = resolve(__dirname, '../../core/examples/hello-world.castscript');

  it('exits 0 for a valid script', () => {
    const { status, stdout } = run('validate', EXAMPLE);
    expect(status).toBe(0);
    expect(stdout).toContain('✔');
  });
});

describe('CLI — compile', () => {
  const EXAMPLE = resolve(__dirname, '../../core/examples/hello-world.castscript');

  it('compiles to stdout with - output', () => {
    const { stdout, status } = run('compile', EXAMPLE, '-', '--seed', '1');
    expect(status).toBe(0);
    // First line is the header — must be valid JSON with version:3
    const header = JSON.parse(stdout.split('\n')[0] ?? '{}') as Record<string, unknown>;
    expect(header['version']).toBe(3);
    const term = header['term'] as Record<string, unknown>;
    expect(term['cols']).toBe(120);
  });
});
