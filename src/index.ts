#!/usr/bin/env node
/**
 * cast-builder — CLI entry point.
 * Wires up commander with all subcommands.
 */

import { Command } from 'commander';
import { registerCompile } from './cli/compile.js';
import { registerValidate } from './cli/validate.js';
import { registerPreview } from './cli/preview.js';
import { registerInit } from './cli/init.js';

const program = new Command();

program
  .name('cast-builder')
  .description('Compile .castscript files into asciinema .cast recordings')
  .version('0.1.0');

registerCompile(program);
registerValidate(program);
registerPreview(program);
registerInit(program);

program.parse(process.argv);
