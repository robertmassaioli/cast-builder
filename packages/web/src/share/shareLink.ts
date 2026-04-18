import LZString from 'lz-string';

const WARN_BYTES = 6_000;
const MAX_BYTES  = 8_000;

export type ShareResult =
  | { ok: true;  url: string; warn: false }
  | { ok: true;  url: string; warn: true; bytes: number }
  | { ok: false; reason: 'too-large'; bytes: number };

/**
 * Compress a .castscript and build a share URL.
 */
export function buildShareUrl(script: string): ShareResult {
  const encoded = LZString.compressToEncodedURIComponent(script);
  const url = `${location.origin}${location.pathname}?s=${encoded}`;
  const bytes = encoded.length;

  if (bytes > MAX_BYTES) return { ok: false, reason: 'too-large', bytes };
  if (bytes > WARN_BYTES) return { ok: true, url, warn: true, bytes };
  return { ok: true, url, warn: false };
}

/**
 * Extract and decompress a shared script from the current URL's `?s=` param.
 * Returns null if the param is absent or the value is malformed.
 */
export function extractSharedScript(): string | null {
  const raw = new URLSearchParams(location.search).get('s');
  if (!raw) return null;
  try {
    const decoded = LZString.decompressFromEncodedURIComponent(raw);
    if (!decoded) return null; // Empty string means decompression failed
    return decoded;
  } catch {
    return null; // Malformed — ignore silently
  }
}

/**
 * Remove the `?s=` param from the URL without triggering a page reload.
 */
export function clearShareParam(): void {
  const url = new URL(location.href);
  url.searchParams.delete('s');
  history.replaceState(null, '', url.toString());
}

/**
 * Scan a .castscript for include: and >> directives that reference external files.
 * Returns a deduplicated list of file paths that would need to be available
 * in the recipient's localStorage for the script to compile.
 */
export function detectExternalDependencies(script: string): string[] {
  const deps: string[] = [];
  for (const line of script.split('\n')) {
    const trimmed = line.trim();
    const includeMatch = trimmed.match(/^include:\s*(\S+?)(?:#\S+)?$/);
    const fileMatch    = trimmed.match(/^>>\s*(\S+)$/);
    if (includeMatch?.[1]) deps.push(includeMatch[1]);
    if (fileMatch?.[1])    deps.push(fileMatch[1]);
  }
  return [...new Set(deps)];
}

/**
 * Copy text to clipboard with fallback for insecure contexts.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for non-HTTPS contexts
    prompt('Copy this share URL:', text);
  }
}
