// Compiler types — the output side of the pipeline.

// ── Cast output types ─────────────────────────────────────────────────────────

export interface CastTheme {
  fg: string; // hex e.g. "#cccccc"
  bg: string; // hex e.g. "#000000"
  palette: string; // 16 colours separated by ":"
}

export interface CastHeader {
  version: 2 | 3;
  cols: number;
  rows: number;
  title?: string;
  timestamp?: number;
  idleTimeLimit?: number;
  env?: Record<string, string>;
  theme?: CastTheme;
}

export type CastEventCode = 'o' | 'i' | 'r' | 'm' | 'x';

export interface CastEvent {
  time: number; // absolute seconds from recording start
  code: CastEventCode;
  data: string;
}

export interface CompiledCast {
  header: CastHeader;
  events: CastEvent[];
}

// ── Typing speed profiles ─────────────────────────────────────────────────────

export interface TypingProfile {
  avgDelayMs: number; // average milliseconds between characters
  jitterMs: number; // maximum random offset (±)
}

export const TYPING_PROFILES: Record<string, TypingProfile> = {
  instant: { avgDelayMs: 0, jitterMs: 0 },
  fast: { avgDelayMs: 30, jitterMs: 10 },
  normal: { avgDelayMs: 80, jitterMs: 40 },
  slow: { avgDelayMs: 150, jitterMs: 60 },
};

// ── FileResolver — browser-safe file I/O abstraction ─────────────────────────

/**
 * Structured error codes for file resolution failures.
 * An enum (not a plain string) so callers can switch exhaustively.
 */
export enum FileResolverErrorCode {
  /** The file does not exist at the given path. */
  NotFound = 'NOT_FOUND',
  /** The file exists but cannot be read (permissions, I/O error, etc.). */
  ReadError = 'READ_ERROR',
  /** The path is outside the permitted root / sandbox. */
  AccessDenied = 'ACCESS_DENIED',
  /** The resolver does not support this type of path (e.g. absolute path in browser). */
  UnsupportedPath = 'UNSUPPORTED_PATH',
}

export interface FileResolverError {
  readonly ok: false;
  readonly code: FileResolverErrorCode;
  /** Human-readable description of what went wrong. */
  readonly message: string;
  /** The original path that was requested. */
  readonly path: string;
}

export interface FileResolverSuccess {
  readonly ok: true;
  /** The file contents as a UTF-8 string. */
  readonly content: string;
}

export type FileResolverResult = FileResolverSuccess | FileResolverError;

/**
 * A function that resolves a file path to its contents.
 * Called by the compiler for `>>` (file-output) and `include:` directives.
 *
 * Returns a discriminated union — never throws. The compiler decides how to
 * handle errors based on CompileOptions.onResolveError.
 *
 * @param path  The raw path string from the directive, verbatim.
 *              Path interpretation (relative/absolute, base dir) is entirely
 *              the resolver's responsibility — core never touches node:path.
 */
export type FileResolver = (path: string) => FileResolverResult | Promise<FileResolverResult>;

/**
 * A no-op resolver that returns ACCESS_DENIED for any path.
 * The default when no resolver is provided — safe in all environments.
 * Scripts with no `>>` or `include:` directives never invoke it.
 */
export const NULL_RESOLVER: FileResolver = (path: string): FileResolverError => ({
  ok: false,
  code: FileResolverErrorCode.AccessDenied,
  message:
    `File access is not available. Pass a FileResolver via CompileOptions to enable ` +
    `">>" and "include:" directives.`,
  path,
});

// ── CompileOptions ────────────────────────────────────────────────────────────

/**
 * Options passed to compile() to inject environmental dependencies.
 * All fields are optional — sensible defaults apply in every environment.
 */
export interface CompileOptions {
  /**
   * Resolver for file paths referenced by `>>` and `include:` directives.
   * Defaults to NULL_RESOLVER (file access disabled, browser-safe).
   */
  resolver?: FileResolver;

  /**
   * Override the Unix timestamp (seconds) stored in the cast header.
   * Useful for:
   *   - Reproducible/deterministic output (pass a fixed value)
   *   - Stripping the recording date before sharing (pass 0)
   *   - Testing (pass a known value to assert on the header)
   *
   * Defaults to Math.floor(Date.now() / 1000) — current wall-clock time.
   */
  now?: number;

  /**
   * How to handle a FileResolverError when `>>` or `include:` fails.
   *
   * - 'error' (default): abort compilation and throw a CompileError
   * - 'warn':  emit a warning output event and continue
   * - 'skip':  silently skip the directive and continue
   */
  onResolveError?: 'error' | 'warn' | 'skip';
}

// ── CompileError ──────────────────────────────────────────────────────────────

/**
 * Thrown by compile() when a fatal compilation error occurs.
 */
export class CompileError extends Error {
  constructor(
    /** Machine-readable code for programmatic handling. */
    public readonly code:
      | 'FILE_RESOLVER_ERROR'
      | 'INVALID_DIRECTIVE'
      | 'INCLUDE_DEPTH_EXCEEDED',
    message: string,
    /** The underlying FileResolverError, if applicable. */
    public readonly cause?: FileResolverError,
  ) {
    super(message);
    this.name = 'CompileError';
  }
}
