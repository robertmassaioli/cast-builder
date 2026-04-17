/**
 * `cast-builder decompile` command handler. (Phase 2)
 *
 * Reverse-engineers a .cast file into a best-effort .castscript.
 * Uses ANSI stripping to extract visible text, then reconstructs
 * command/output boundaries based on common prompt patterns.
 *
 * This is intentionally best-effort: ANSI state reconstruction is lossy,
 * but the output gives a solid starting point for editing.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import type { Command } from 'commander';

// ── ANSI stripping ────────────────────────────────────────────────────────────

// Matches ESC[ ... m sequences and other common escape codes
const ANSI_ESCAPE_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b[()][0-9A-Za-z]|\x1b[=>]|\x07|\x08|\x0f|\x0e/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_ESCAPE_RE, '');
}

// ── Cast file types ───────────────────────────────────────────────────────────

interface CastHeaderRaw {
  version: number;
  width: number;
  height: number;
  title?: string;
  timestamp?: number;
  idle_time_limit?: number;
  env?: Record<string, string>;
}

type CastEventRaw = [number, string, string];

// ── Prompt detection ──────────────────────────────────────────────────────────

// Common prompt endings that indicate a line is a shell prompt
const PROMPT_ENDINGS = ['$ ', '# ', '% ', '> '];

function looksLikePrompt(line: string): boolean {
  return PROMPT_ENDINGS.some((end) => line.includes(end));
}

function splitPromptAndCommand(line: string): { prompt: string; command: string } | null {
  for (const ending of PROMPT_ENDINGS) {
    const idx = line.indexOf(ending);
    if (idx !== -1) {
      return {
        prompt: line.slice(0, idx + ending.length),
        command: line.slice(idx + ending.length),
      };
    }
  }
  return null;
}

// ── Main decompile logic ──────────────────────────────────────────────────────

interface DecompileOptions {
  prompt?: string;
  noStrip?: boolean;
}

export function registerDecompile(program: Command): void {
  program
    .command('decompile <cast> [output]')
    .description('Reverse-engineer a .cast file into an editable .castscript (best-effort)')
    .option('--prompt <pattern>', 'Known prompt string to use for command detection')
    .option('--no-strip', 'Do not strip ANSI escape sequences from output lines')
    .action((castPath: string, outputPath: string | undefined, opts: DecompileOptions) => {
      const raw = castPath === '-' ? readFileSync('/dev/stdin', 'utf8') : readFileSync(castPath, 'utf8');
      const lines = raw.trim().split('\n').filter(Boolean);

      if (lines.length === 0) {
        console.error('Error: empty or invalid .cast file');
        process.exit(1);
      }

      // Parse header
      const header = JSON.parse(lines[0] ?? '{}') as CastHeaderRaw;
      const isV3 = header.version === 3;

      // Parse events, converting v3 deltas → absolute times
      let clock = 0;
      const events: Array<{ time: number; code: string; data: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const raw = JSON.parse(lines[i] ?? '[]') as CastEventRaw;
        const [dt, code, data] = raw;
        if (isV3) {
          clock += dt ?? 0;
        } else {
          clock = dt ?? 0;
        }
        events.push({ time: clock, code: code ?? 'o', data: data ?? '' });
      }

      // ── Reconstruct visible terminal output ────────────────────────────────
      // Accumulate output-type events into logical "lines" by splitting on \r\n / \n
      // We buffer until we have a full line, then decide if it's a prompt or output.

      const script = decompileEvents(events, header, opts);

      if (!outputPath || outputPath === '-') {
        process.stdout.write(script);
      } else {
        writeFileSync(outputPath, script, { flag: 'wx' });
        console.error(`Written to ${outputPath}`);
      }
    });
}

function decompileEvents(
  events: Array<{ time: number; code: string; data: string }>,
  header: CastHeaderRaw,
  opts: DecompileOptions,
): string {
  const lines: string[] = [];

  // Config section
  lines.push('--- config ---');
  lines.push(`width:        ${header.width}`);
  lines.push(`height:       ${header.height}`);
  if (header.title) lines.push(`title:        ${header.title}`);
  if (header.idle_time_limit) lines.push(`idle-time:    ${header.idle_time_limit}`);
  if (header.env) {
    for (const [k, v] of Object.entries(header.env)) {
      lines.push(`env:          ${k}=${v}`);
    }
  }
  lines.push('typing-speed: normal');
  lines.push('');
  lines.push('--- script ---');
  lines.push('');

  // Reconstruct lines from event stream
  let buf = '';
  const terminalLines: Array<{ time: number; text: string; code: string }> = [];

  for (const ev of events) {
    if (ev.code === 'm') {
      // Flush buffer first
      if (buf.trim()) {
        terminalLines.push({ time: ev.time, text: buf, code: 'o' });
        buf = '';
      }
      terminalLines.push({ time: ev.time, text: ev.data, code: 'm' });
      continue;
    }
    if (ev.code === 'r') {
      terminalLines.push({ time: ev.time, text: ev.data, code: 'r' });
      continue;
    }
    if (ev.code !== 'o') continue;

    buf += ev.data;

    // Split on CR+LF or just LF
    const lineBreaks = buf.split(/\r?\n/);
    for (let i = 0; i < lineBreaks.length - 1; i++) {
      terminalLines.push({ time: ev.time, text: lineBreaks[i] ?? '', code: 'o' });
    }
    buf = lineBreaks[lineBreaks.length - 1] ?? '';
  }
  if (buf.trim()) {
    terminalLines.push({ time: 0, text: buf, code: 'o' });
  }

  // ── Reconstruct script from terminal lines ─────────────────────────────────
  let detectedPrompt = opts.prompt ?? '';
  let prevTime = 0;
  let lastCommandTime = 0;
  let inCommandOutput = false;

  for (const tl of terminalLines) {
    const elapsed = tl.time - prevTime;
    prevTime = tl.time;

    // Markers
    if (tl.code === 'm') {
      lines.push(`marker: ${tl.text}`);
      lines.push('');
      inCommandOutput = false;
      continue;
    }

    // Resize events
    if (tl.code === 'r') {
      lines.push(`resize: ${tl.text}`);
      continue;
    }

    const visible = opts.noStrip ? tl.text : stripAnsi(tl.text);

    // Large gaps → insert wait
    const gap = tl.time - lastCommandTime;
    if (inCommandOutput && gap > 2.0) {
      const gapMs = Math.round(gap * 1000);
      lines.push(`wait: ${gapMs >= 1000 ? `${(gapMs / 1000).toFixed(1)}s` : `${gapMs}ms`}`);
    }

    // Detect prompts
    const promptSplit = splitPromptAndCommand(visible);
    if (promptSplit && (looksLikePrompt(visible) || (detectedPrompt && visible.startsWith(detectedPrompt)))) {
      if (!detectedPrompt) {
        detectedPrompt = promptSplit.prompt;
      }
      if (promptSplit.command.trim()) {
        if (inCommandOutput) lines.push('');
        lines.push(`$ ${promptSplit.command}`);
        inCommandOutput = false;
        lastCommandTime = tl.time;
      }
      // Empty prompt line (just the prompt, no command yet) — skip
      continue;
    }

    // Long idle pause before a non-prompt line
    if (!inCommandOutput && elapsed > 1.5) {
      const ms = Math.round(elapsed * 1000);
      lines.push(`wait: ${ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}`);
    }

    // Output line — emit only if non-empty after ANSI stripping
    if (visible.trim() || (!opts.noStrip && tl.text.trim())) {
      // Check for clear screen
      if (tl.text.includes('\x1b[2J')) {
        lines.push('clear');
        inCommandOutput = false;
        continue;
      }
      lines.push(`> ${visible}`);
      inCommandOutput = true;
    }
  }

  lines.push('');
  return lines.join('\n');
}
