#!/usr/bin/env node
/**
 * cast-builder — CLI entry point.
 * Wires up commander with all subcommands.
 */

import { Command } from 'commander';
import { registerCompile } from './commands/compile.js';
import { registerValidate } from './commands/validate.js';
import { registerPreview } from './commands/preview.js';
import { registerInit } from './commands/init.js';
import { registerDecompile } from './commands/decompile.js';

const program = new Command();

program
  .name('cast-builder')
  .description('Compile .castscript files into asciinema .cast recordings')
  .version('0.1.0');

registerCompile(program);
registerValidate(program);
registerPreview(program);
registerInit(program);
registerDecompile(program);

program.parse(process.argv);
