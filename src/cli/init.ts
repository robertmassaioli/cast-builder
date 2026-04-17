/**
 * `cast-builder init` command handler.
 * Generates a starter .castscript scaffold file.
 */

import { writeFileSync } from 'node:fs';
import type { Command } from 'commander';

const TEMPLATE = `--- config ---
title:        My Demo
width:        120
height:       30
prompt:       user@host:~/project$ 
theme:        default
typing-speed: normal
idle-time:    1.0

--- script ---

# ── Add your script directives below ──────────────────────────────
#
# Directives reference:
#   $ command          — type and run a shell command
#   > output line      — expected output from the previous command
#   >> path/to/file    — embed file contents as output
#   type: text         — type text without pressing Enter
#   hidden: text       — type text that does not echo (e.g. password)
#   print: text        — instantly print text (no typing animation)
#   wait: 2s           — insert a pause (also: 500ms)
#   clear              — clear the screen
#   marker: Label      — insert a named chapter marker
#   resize: 80x24      — change terminal dimensions
#   set typing-speed: fast  — override a config value mid-script
#   raw: \\x1b[1mBold\\x1b[0m  — emit a raw ANSI escape sequence
#
# Inline style tags in output lines:
#   > {bold: text}           {green: text}      {red: text}
#   > {bold green: text}     {#ff6600: text}    {bg-blue: text}

marker: Start

$ echo "Hello, world!"
> Hello, world!

wait: 1s

$ echo "Edit this script to build your demo."
> Edit this script to build your demo.
`;

export function registerInit(program: Command): void {
  program
    .command('init [output]')
    .description('Generate a starter .castscript file (default: demo.castscript)')
    .action((outputPath: string | undefined) => {
      const dest = outputPath ?? 'demo.castscript';
      try {
        writeFileSync(dest, TEMPLATE, { flag: 'wx' });
        console.log(`Created ${dest}`);
        console.log(`Edit it, then run: cast-builder compile ${dest} ${dest.replace('.castscript', '.cast')}`);
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EEXIST') {
          console.error(`File already exists: ${dest}. Use a different name or delete it first.`);
          process.exit(1);
        }
        throw err;
      }
    });
}
