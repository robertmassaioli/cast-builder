/**
 * `cast-builder preview` command handler.
 * Compiles and pipes output to `asciinema play -` for instant preview.
 */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parse } from '../parser/parser.js';
import { compile } from '../compiler/compiler.js';
import { encodeV3 } from '../encoder/v3.js';
import type { Command } from 'commander';

export function registerPreview(program: Command): void {
  program
    .command('preview <script>')
    .description('Compile and immediately preview with asciinema play')
    .action((scriptPath: string) => {
      const source =
        scriptPath === '-' ? readFileSync('/dev/stdin', 'utf8') : readFileSync(scriptPath, 'utf8');

      const { config, nodes } = parse(source);
      const compiled = compile(config, nodes);
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
