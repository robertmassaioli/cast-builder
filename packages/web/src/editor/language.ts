/**
 * CodeMirror 6 — .castscript syntax highlighting.
 * Defines token types used by the highlight rules.
 */
import { StreamLanguage } from '@codemirror/language';
import type { StringStream } from '@codemirror/language';

type TokenType = string | null;

/**
 * A simple stream parser for .castscript syntax.
 * Returns CodeMirror token type names that map to highlight styles.
 */
export const castscriptLanguage = StreamLanguage.define({
  name: 'castscript',

  token(stream: StringStream): TokenType {
    // Section headers
    if (stream.match(/^--- (config|script) ---/)) return 'keyword';

    // Comments
    if (stream.match(/^\s*#.*/)) return 'comment';

    // Block labels [name]
    if (stream.match(/^\[.+\]/)) return 'labelName';

    // Command directive
    if (stream.match(/^\$ /)) { stream.skipToEnd(); return 'operator'; }

    // Output directives
    if (stream.match(/^>> /)) { stream.skipToEnd(); return 'string'; }
    if (stream.match(/^> /)) { stream.skipToEnd(); return 'string'; }

    // Named directives with colon
    if (stream.match(/^(type|hidden|print|wait|marker|resize|set|include|raw|clear)\b/)) {
      return 'keyword';
    }

    // Config keys (inside config section)
    if (stream.match(/^(title|width|height|shell|prompt|theme|typing-speed|typing-seed|idle-time|output-format|env)\s*:/)) {
      return 'atom';
    }

    // Inline style tags {modifier: content}
    if (stream.match(/\{[^}]*\}/)) return 'variableName';

    stream.next();
    return null;
  },
});
