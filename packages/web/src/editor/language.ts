/**
 * CodeMirror 6 — .castscript syntax highlighting via StreamLanguage.
 *
 * Uses the CM6 StreamLanguage adapter (simpler than a full Lezer grammar,
 * sufficient for a line-oriented format like .castscript).
 *
 * Token types map to @lezer/highlight tags used in highlight.ts.
 */
import { StreamLanguage, LanguageSupport } from '@codemirror/language';
import type { StringStream } from '@codemirror/language';

type TokenType = string | null;

/** Section we are currently parsing — drives context-aware highlighting. */
type Section = 'none' | 'config' | 'script';

interface State {
  section: Section;
}

const castscriptStream = StreamLanguage.define<State>({
  name: 'castscript',

  startState(): State {
    return { section: 'none' };
  },

  token(stream: StringStream, state: State): TokenType {
    // ── Section headers ───────────────────────────────────────────────────────
    if (stream.match(/^--- config ---/)) {
      state.section = 'config';
      return 'keyword';
    }
    if (stream.match(/^--- script ---/)) {
      state.section = 'script';
      return 'keyword';
    }

    // ── Comments ───────────────────────────────────────────────────────────────
    if (stream.match(/^\s*#.*/)) return 'comment';

    // ── Config section ─────────────────────────────────────────────────────────
    if (state.section === 'config') {
      // Key: value — highlight key as atom, leave value for next token
      if (stream.match(/^(title|width|height|shell|prompt|theme|typing-speed|typing-seed|idle-time|output-format|env)\s*:/)) {
        return 'atom';
      }
      // Typing speed values
      if (stream.match(/\b(instant|fast|normal|slow)\b/)) return 'string';
      // Numbers (width/height/idle-time values)
      if (stream.match(/\b\d+(\.\d+)?(ms|s)?\b/)) return 'number';
      stream.next();
      return null;
    }

    // ── Script section ─────────────────────────────────────────────────────────

    // Block labels [name]
    if (stream.match(/^\[.+\]/)) return 'labelName';

    // $ command — prompt char highlighted differently from command text
    if (stream.match(/^\$ /)) {
      stream.skipToEnd();
      return 'typeName'; // command text — distinct colour
    }

    // >> file output
    if (stream.match(/^>> /)) {
      stream.skipToEnd();
      return 'link';
    }

    // > output line — highlight inline style tags within it
    if (stream.match(/^> /)) {
      // Scan for inline style tags {modifier: content}
      let result = 'string';
      stream.eatWhile((ch: string) => ch !== '{' && ch !== '\n');
      if (stream.peek() === '{') return result;
      return result;
    }

    // Inline style tag opening brace
    if (stream.match(/^\{[^}:]*:/)) return 'variableName';
    if (stream.match(/^\}/)) return 'variableName';

    // Named directives (keyword highlighting)
    if (stream.match(/^(type|hidden|print|wait|marker|resize|set|include|raw|clear)\b/)) {
      return 'keyword';
    }

    // wait/resize values
    if (stream.match(/\b\d+(\.\d+)?(ms|s|x\d+)?\b/)) return 'number';

    // Typing speed values inline (after set typing-speed:)
    if (stream.match(/\b(instant|fast|normal|slow)\b/)) return 'string';

    stream.next();
    return null;
  },

  blankLine(_state: State): void {
    // Blank lines don't change section state
  },

  copyState(state: State): State {
    return { ...state };
  },
});

export const castscriptLanguage = new LanguageSupport(castscriptStream);
