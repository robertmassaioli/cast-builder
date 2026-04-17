/**
 * Node.js FileResolver implementation for the CLI.
 * This is the only place in the CLI that imports node:fs / node:path.
 * @cast-builder/core itself has no such imports.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FileResolverErrorCode,
  type FileResolver,
  type FileResolverResult,
} from '@cast-builder/core';

/**
 * Create a FileResolver that reads files from the local filesystem,
 * relative to the given base directory (typically the directory of the
 * .castscript file being compiled).
 */
export function createNodeResolver(baseDir: string): FileResolver {
  return (path: string): FileResolverResult => {
    const fullPath = resolve(baseDir, path);

    if (!existsSync(fullPath)) {
      return {
        ok: false,
        code: FileResolverErrorCode.NotFound,
        message: `File not found: ${fullPath}`,
        path,
      };
    }

    try {
      const content = readFileSync(fullPath, 'utf8');
      return { ok: true, content };
    } catch (err) {
      return {
        ok: false,
        code: FileResolverErrorCode.ReadError,
        message: `Could not read "${fullPath}": ${String(err)}`,
        path,
      };
    }
  };
}
