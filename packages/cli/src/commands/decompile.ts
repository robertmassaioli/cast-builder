/**
 * `cast-builder decompile` command handler.
 *
 * Reverse-engineers a .cast file into a best-effort .castscript.
 *
 * Strategy:
 * 1. Parse events, convert v3 deltas → absolute times.
 * 2. Feed raw bytes through a VT100 state machine that handles cursor movement,
 *    backspace, OSC sequences (title/CWD), CSI sequences (colour, cursor, erase).
 * 3. Collect complete lines (terminated by \n). Discard lines that are purely
 *    control/decoration (prompts, bracketed-paste markers, title sequences).
 * 4. Identify command lines by detecting common prompt endings ($ # % ❯ ○).
 * 5. Reconstruct .castscript directives: markers, resizes, waits, $, >.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { ScreenBuffer, stripAllEscapes } from '@cast-builder/core';

// ── Cast file types ───────────────────────────────────────────────────────────

interface CastHeaderRaw {
  version: number;
  // v2 flat fields
  width?: number;
  height?: number;
  // v3 nested term object
  term?: {
    cols?: number;
    rows?: number;
  };
  title?: string;
  timestamp?: number;
  idle_time_limit?: number;
  env?: Record<string, string>;
}

type CastEventRaw = [number, string, string];

// ── Prompt patterns ───────────────────────────────────────────────────────────

// Patterns that indicate the END of a prompt (the character just before the command).
// We look for these anywhere in a visible line to detect where the user typed a command.
// Note: these match the prompt SUFFIX so we can split prompt from command.
const PROMPT_END_PATTERNS = [
  // bash/sh: must have something before the $ (hostname, path, etc.)
  // Use \S to require a non-space char before "$ " to avoid matching
  // shell variable expansions like "echo $HOME" or bare "$ " in output
  /\S\$\s+/,         // bash/sh:   "user@host:~$ cmd"
  // Root prompt: require a non-space, non-# char before "# " to avoid matching
  // Markdown headings (# Title, ## Section, ### Sub) and comments
  /[^\s#]#\s+/,      // root:      "root@host:~# cmd"
  /%\s+/,            // zsh:       "user@host ~% cmd"
  /❯\s+/,            // oh-my-zsh: "❯ cmd"
  /○\s+/,            // starship / p10k: "╰─○ cmd"
  /→\s+/,            // some custom prompts
];

// Additional lines to discard (purely decorative / control lines)
const DISCARD_PATTERNS = [
  /^\s*$/,                           // blank
  /^\x1b/,                           // starts with escape (residual)
  /\]\d+;/,                          // OSC remnants
  /\[\?[0-9]+[hl]/,                  // mode set/reset remnants
  /^╭─/,                             // top line of multi-line zsh prompt (╭─ path...)
  /^%\s*$/,                          // zsh "%" marker printed after command
];

/**
 * Detect a line that looks like a command typed after a multi-line prompt.
 * In zsh themes like p10k/starship, the user types on the line starting with
 * "╰─○ " but the buffer replaces those chars with spaces as the user types,
 * leaving leading whitespace before the command text.
 * Heuristic: line starts with 2–8 spaces followed by a non-space word.
 */
function looksLikeIndentedCommand(line: string, prevLineWasPrompt: boolean): boolean {
  if (!prevLineWasPrompt) return false;
  return /^ {1,8}\S/.test(line);
}

function looksLikePromptLine(line: string): boolean {
  return PROMPT_END_PATTERNS.some((re) => re.test(line));
}

function shouldDiscard(line: string): boolean {
  return DISCARD_PATTERNS.some((re) => re.test(line));
}

/**
 * Split a line containing a prompt suffix into {prompt, command}.
 * Finds the LAST occurrence of a prompt pattern so that prompts
 * containing "$ " in path names (e.g. /home/$USER) don't false-match.
 * Returns null if no prompt ending is found.
 */
function splitAtPrompt(line: string): { prompt: string; command: string } | null {
  let bestIdx = -1;
  let bestLen = 0;

  for (const re of PROMPT_END_PATTERNS) {
    // Find the last match in the line
    let lastIdx = -1;
    let lastLen = 0;
    const global = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = global.exec(line)) !== null) {
      lastIdx = m.index;
      lastLen = m[0].length;
    }
    if (lastIdx > bestIdx) {
      bestIdx = lastIdx;
      bestLen = lastLen;
    }
  }

  if (bestIdx === -1) return null;

  return {
    prompt: line.slice(0, bestIdx + bestLen),
    command: line.slice(bestIdx + bestLen).trim(),
  };
}

// ── CLI registration ──────────────────────────────────────────────────────────

export interface DecompileOptions {
  prompt?: string;
  noStrip?: boolean;
}

export function registerDecompile(program: Command): void {
  program
    .command('decompile <cast> [output]')
    .description('Reverse-engineer a .cast file into an editable .castscript (best-effort)')
    .option('--prompt <pattern>', 'Known prompt suffix to use for command detection (e.g. "$ ")')
    .option('--no-strip', 'Preserve raw ANSI escape sequences in output lines')
    .action((castPath: string, outputPath: string | undefined, opts: DecompileOptions) => {
      const raw =
        castPath === '-' ? readFileSync('/dev/stdin', 'utf8') : readFileSync(castPath, 'utf8');
      const lines = raw.trim().split('\n').filter(Boolean);

      if (lines.length === 0) {
        console.error('Error: empty or invalid .cast file');
        process.exit(1);
      }

      // Parse header — wrap in try-catch so malformed files give a clean error
      let header: CastHeaderRaw;
      try {
        header = JSON.parse(lines[0] ?? '{}') as CastHeaderRaw;
      } catch {
        console.error('Error: invalid cast file — header line is not valid JSON.');
        process.exit(1);
      }

      if (header.version !== 2 && header.version !== 3) {
        console.error(
          `Error: unsupported cast version "${String(header.version)}". Expected 2 or 3.`,
        );
        process.exit(1);
      }

      const isV3 = header.version === 3;

      // Resolve terminal dimensions (v2: width/height, v3: term.cols/term.rows)
      const cols = header.term?.cols ?? header.width ?? 120;
      const rows = header.term?.rows ?? header.height ?? 30;

      // Parse events, converting v3 deltas → absolute times.
      // Skip any event lines that fail to parse — warn but continue.
      let clock = 0;
      const events: Array<{ time: number; code: string; data: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        let ev: CastEventRaw;
        try {
          ev = JSON.parse(lines[i] ?? '[]') as CastEventRaw;
        } catch {
          console.warn(`Warning: skipping malformed event on line ${i + 1}.`);
          continue;
        }
        if (!Array.isArray(ev) || ev.length < 3) {
          console.warn(`Warning: skipping invalid event on line ${i + 1} (expected [time, code, data]).`);
          continue;
        }
        const [dt, code, data] = ev;
        clock = isV3 ? clock + (dt ?? 0) : (dt ?? 0);
        events.push({ time: clock, code: code ?? 'o', data: data ?? '' });
      }

      const script = decompileEvents(events, header, cols, rows, opts);

      if (!outputPath || outputPath === '-') {
        process.stdout.write(script);
      } else {
        writeFileSync(outputPath, script, { flag: 'wx' });
        console.error(`Written to ${outputPath}`);
      }
    });
}

// ── Core decompile logic ──────────────────────────────────────────────────────

interface LogicalLine {
  time: number;
  text: string;        // visible text (ANSI stripped)
  code: string;        // 'o' | 'm' | 'r'
}

function decompileEvents(
  events: Array<{ time: number; code: string; data: string }>,
  header: CastHeaderRaw,
  cols: number,
  rows: number,
  opts: DecompileOptions,
): string {
  // ── Pass 1: reconstruct visible lines via terminal state machine ─────────────
  const buffer = new ScreenBuffer(cols, rows);
  const logicalLines: LogicalLine[] = [];
  let lastTime = 0;

  for (const ev of events) {
    lastTime = ev.time;

    if (ev.code === 'm') {
      logicalLines.push({ time: ev.time, text: ev.data, code: 'm' });
      continue;
    }
    if (ev.code === 'r') {
      const visible = stripAllEscapes(ev.data).trim();
      if (visible) logicalLines.push({ time: ev.time, text: visible, code: 'r' });
      continue;
    }
    if (ev.code !== 'o') continue;

    // Feed bytes into the terminal state machine
    const completedLines = buffer.feed(ev.data);
    for (const line of completedLines) {
      const visible = stripAllEscapes(line).trimEnd();
      logicalLines.push({ time: ev.time, text: visible, code: 'o' });
    }
  }

  // Flush any partial line still in the buffer
  const flushed = stripAllEscapes(buffer.flush()).trimEnd();
  if (flushed.trim()) {
    logicalLines.push({ time: lastTime, text: flushed, code: 'o' });
  }

  // ── Pass 2: reconstruct .castscript directives ───────────────────────────────
  const out: string[] = [];

  // Config section
  out.push('--- config ---');
  out.push(`width:        ${cols}`);
  out.push(`height:       ${rows}`);
  if (header.title) out.push(`title:        ${header.title}`);
  if (header.idle_time_limit) out.push(`idle-time:    ${header.idle_time_limit}`);
  if (header.env) {
    for (const [k, v] of Object.entries(header.env)) {
      out.push(`env:          ${k}=${v}`);
    }
  }
  out.push('typing-speed: normal');
  out.push('');
  out.push('--- script ---');
  out.push('');

  // State for pass 2
  let prevCommandTime = 0;
  let inOutput = false;
  let detectedPrompt = opts.prompt ?? '';
  let prevLineWasTopPrompt = false; // true after seeing a "╭─" top-of-prompt line

  // Idle gap threshold: only emit wait: for gaps > this many seconds
  const WAIT_THRESHOLD = 1.5;
  // Min gap between output lines before emitting wait:
  const OUTPUT_GAP_THRESHOLD = 3.0;

  for (const ll of logicalLines) {
    // Markers — always emit
    if (ll.code === 'm') {
      if (inOutput) out.push('');
      out.push(`marker: ${ll.text}`);
      out.push('');
      inOutput = false;
      prevCommandTime = ll.time;
      prevLineWasTopPrompt = false;
      continue;
    }

    // Resize events
    if (ll.code === 'r') {
      out.push(`resize: ${ll.text}`);
      continue;
    }

    const text = ll.text;

    // Track whether this is the top line of a multi-line zsh prompt (╭─ ...)
    const isTopPromptLine = /^╭─/.test(text);

    // Discard decorative/control lines
    if (shouldDiscard(text)) {
      if (isTopPromptLine) prevLineWasTopPrompt = true;
      continue;
    }

    // Detect indented command line typed after a multi-line prompt (╰─○ → spaces)
    if (looksLikeIndentedCommand(text, prevLineWasTopPrompt)) {
      const command = text.trim();
      if (command) {
        const gap = ll.time - prevCommandTime;
        if (prevCommandTime > 0 && gap > WAIT_THRESHOLD) {
          const ms = Math.round(gap * 1000);
          if (inOutput) out.push('');
          out.push(`wait: ${ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}`);
        }
        if (inOutput) out.push('');
        out.push(`$ ${command}`);
        inOutput = false;
        prevCommandTime = ll.time;
        prevLineWasTopPrompt = false;
      }
      continue;
    }

    prevLineWasTopPrompt = false;

    // Detect single-line prompt (bash/fish/etc.) with command on same line
    const promptSplit = looksLikePromptLine(text) ? splitAtPrompt(text) : null;

    if (promptSplit || (detectedPrompt && text.includes(detectedPrompt))) {
      const split = promptSplit ?? {
        prompt: detectedPrompt,
        command: text.slice(text.indexOf(detectedPrompt) + detectedPrompt.length).trim(),
      };

      // Learn the prompt if we haven't yet
      if (!detectedPrompt && split.prompt) {
        detectedPrompt = split.prompt.trim().split('\n').pop() ?? split.prompt;
      }

      // Only emit if there's an actual command
      if (split.command.trim()) {
        const gap = ll.time - prevCommandTime;
        if (prevCommandTime > 0 && gap > WAIT_THRESHOLD) {
          const ms = Math.round(gap * 1000);
          if (inOutput) out.push('');
          out.push(`wait: ${ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}`);
        }
        if (inOutput) out.push('');
        out.push(`$ ${split.command}`);
        inOutput = false;
        prevCommandTime = ll.time;
      }
      continue;
    }

    // Check for clear screen
    if (text.includes('\x1b[2J') || text === '\x1b[2J\x1b[H') {
      if (inOutput) out.push('');
      out.push('clear');
      inOutput = false;
      continue;
    }

    // Suppress empty lines that are just cursor noise
    if (!text.trim()) {
      if (inOutput) out.push('>');
      continue;
    }

    // Large gap between consecutive output lines — insert wait
    const gap = ll.time - prevCommandTime;
    if (inOutput && gap > OUTPUT_GAP_THRESHOLD) {
      const ms = Math.round(gap * 1000);
      out.push(`wait: ${ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}`);
      prevCommandTime = ll.time;
    }

    out.push(`> ${text}`);
    inOutput = true;
  }

  out.push('');
  return out.join('\n');
}
