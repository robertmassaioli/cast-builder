/**
 * `cast-builder validate` command handler.
 */

import { readFileSync } from 'node:fs';
import { parse } from '../parser/parser.js';
import type { Command } from 'commander';

export function registerValidate(program: Command): void {
  program
    .command('validate <script>')
    .description('Parse and validate a .castscript file without producing output')
    .action((scriptPath: string) => {
      try {
        const source =
          scriptPath === '-' ? readFileSync('/dev/stdin', 'utf8') : readFileSync(scriptPath, 'utf8');
        const result = parse(source);
        const nodeCount = result.nodes.filter((n) => n.kind !== 'comment').length;
        console.log(`✔ Valid — ${nodeCount} directive(s) parsed.`);
        process.exit(0);
      } catch (err) {
        console.error(`✘ ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
