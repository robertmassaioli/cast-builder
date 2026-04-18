/**
 * Browser compile wrapper.
 * Wraps @cast-builder/core's compile() with:
 *  - An in-memory FileResolver backed by saved localStorage scripts
 *  - Debouncing
 *  - Structured result type (success | error)
 */

import {
  parse,
  compile,
  encodeV3,
  FileResolverErrorCode,
  type FileResolverResult,
} from '@cast-builder/core';
import { buildSavedScriptMap } from '../storage/localStorage.js';

export interface CompileSuccess {
  ok: true;
  cast: string;       // NDJSON asciicast v3 string
  eventCount: number;
  durationMs: number; // compile time in ms
  totalSeconds: number; // recording duration
}

export interface CompileFailure {
  ok: false;
  message: string;
  line?: number;
}

export type CompileResult = CompileSuccess | CompileFailure;

/**
 * Compile a .castscript source string in the browser.
 * Uses saved localStorage scripts as the FileResolver backing store.
 */
export async function compileScript(source: string): Promise<CompileResult> {
  const t0 = performance.now();

  try {
    const { config, nodes } = parse(source);

    // Build an in-memory resolver from saved scripts
    const savedFiles = buildSavedScriptMap();
    const resolver = (path: string): FileResolverResult => {
      const content = savedFiles.get(path);
      if (content === undefined) {
        return {
          ok: false,
          code: FileResolverErrorCode.NotFound,
          message: `File "${path}" not found. Save a script with that name to use it in include: directives.`,
          path,
        };
      }
      return { ok: true, content };
    };

    const compiled = await compile(config, nodes, {
      resolver,
      onResolveError: 'warn', // show warnings in the cast rather than crashing
      now: 0,                 // deterministic timestamp
    });

    const cast = encodeV3(compiled);
    const durationMs = performance.now() - t0;
    const totalSeconds = compiled.events.at(-1)?.time ?? 0;

    return {
      ok: true,
      cast,
      eventCount: compiled.events.length,
      durationMs: Math.round(durationMs * 10) / 10,
      totalSeconds,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Try to extract a line number from ParseError messages: "Line N: ..."
    const lineMatch = message.match(/^Line (\d+):/);
    return {
      ok: false,
      message,
      line: lineMatch ? parseInt(lineMatch[1] ?? '0', 10) : undefined,
    };
  }
}

/**
 * Debounce helper — returns a debounced version of `fn`.
 */
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delayMs: number,
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
