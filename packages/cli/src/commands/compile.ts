/**
 * `cast-builder compile` command handler.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse, compile, encodeV3, encodeV2 } from '@cast-builder/core';
import type { Command } from 'commander';
import { createNodeResolver } from '../resolvers/node.js';

export interface CompileOptions {
  format?: 'v2' | 'v3';
  typingSpeed?: string;
  seed?: string;
  noJitter?: boolean;
  now?: string;
  onResolveError?: 'error' | 'warn' | 'skip';
  overwrite?: boolean;
}

export function registerCompile(program: Command): void {
  program
    .command('compile <script> [output]')
    .description('Compile a .castscript file into an asciicast .cast file')
    .option('-f, --format <v2|v3>', 'Output format (default: v3)')
    .option('--typing-speed <speed>', 'Override typing speed (slow|normal|fast|instant|Nms)')
    .option('--seed <n>', 'Seed for RNG (makes timing deterministic)')
    .option('--no-jitter', 'Disable timing jitter (fully deterministic)')
    .option('--now <timestamp>', 'Override the cast header timestamp (Unix seconds, use 0 for reproducible output)')
    .option(
      '--on-resolve-error <mode>',
      'How to handle missing files from ">>" and "include:": error (default) | warn | skip',
    )
    .option('--overwrite', 'Overwrite output file if it exists')
    .action(async (scriptPath: string, outputPath: string | undefined, opts: CompileOptions) => {
      // Read input
      const isStdin = scriptPath === '-';
      const source = isStdin ? readFileSync('/dev/stdin', 'utf8') : readFileSync(scriptPath, 'utf8');
      const sourceDir = isStdin ? process.cwd() : dirname(resolve(scriptPath));

      // Parse
      const { config, nodes } = parse(source);

      // Apply CLI overrides
      if (opts.format) config.outputFormat = opts.format;
      if (opts.typingSpeed) {
        const s = opts.typingSpeed;
        config.typingSpeed =
          s === 'instant' || s === 'fast' || s === 'normal' || s === 'slow'
            ? s
            : parseInt(s, 10) || 'normal';
      }
      if (opts.seed) config.typingSeed = parseInt(opts.seed, 10);
      if (opts.noJitter) { config.typingSpeed = 'instant'; }

      // Validate --on-resolve-error value
      const onResolveError = opts.onResolveError ?? 'error';
      if (onResolveError !== 'error' && onResolveError !== 'warn' && onResolveError !== 'skip') {
        console.error(`Error: --on-resolve-error must be one of: error, warn, skip`);
        process.exit(1);
      }

      // Compile
      const compiled = await compile(config, nodes, {
        resolver: createNodeResolver(sourceDir),
        onResolveError,
        ...(opts.now !== undefined ? { now: parseInt(opts.now, 10) } : {}),
      });

      // Encode
      const output = config.outputFormat === 'v2' ? encodeV2(compiled) : encodeV3(compiled);

      // Write output
      if (!outputPath || outputPath === '-') {
        process.stdout.write(output);
      } else {
        writeFileSync(outputPath, output, { flag: opts.overwrite ? 'w' : 'wx' });
        console.error(`Written to ${outputPath}`);
      }
    });
}
