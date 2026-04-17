/**
 * `cast-builder preview` command handler.
 * Compiles and pipes output to `asciinema play -` for instant preview.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse, compile, encodeV3 } from '@cast-builder/core';
import type { Command } from 'commander';
import { createNodeResolver } from '../resolvers/node.js';

export function registerPreview(program: Command): void {
  program
    .command('preview <script>')
    .description('Compile and immediately preview with asciinema play')
    .action(async (scriptPath: string) => {
      const isStdin = scriptPath === '-';
      const source = isStdin ? readFileSync('/dev/stdin', 'utf8') : readFileSync(scriptPath, 'utf8');
      const sourceDir = isStdin ? process.cwd() : dirname(resolve(scriptPath));

      const { config, nodes } = parse(source);
      const compiled = await compile(config, nodes, {
        resolver: createNodeResolver(sourceDir),
        onResolveError: 'error',
      });
      const output = encodeV3(compiled);

      const result = spawnSync('asciinema', ['play', '-'], {
        input: output,
        stdio: ['pipe', 'inherit', 'inherit'],
      });

      if (result.error) {
        console.error('Could not run asciinema. Make sure it is installed and on your PATH.');
        process.exit(1);
      }

      process.exit(result.status ?? 0);
    });
}
