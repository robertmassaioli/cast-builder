/**
 * CodeMirror 6 — syntax highlight theme for .castscript.
 * Maps lezer tag names (returned by the stream parser) to colours.
 * Uses two themes — dark (default) and light — applied via data-theme attribute.
 */
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { EditorView } from '@codemirror/view';

// ── Dark theme (default) ──────────────────────────────────────────────────────
export const darkHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword,      color: '#7c6af7', fontWeight: 'bold' }, // section headers + directives
    { tag: tags.comment,      color: '#6e7681', fontStyle: 'italic' },
    { tag: tags.string,       color: '#a8d8a8' },                     // > output lines
    { tag: tags.typeName,     color: '#79c0ff', fontWeight: 'bold' }, // $ commands
    { tag: tags.link,         color: '#ffa657' },                     // >> file
    { tag: tags.atom,         color: '#ffa657' },                     // config keys
    { tag: tags.number,       color: '#f2cc60' },                     // durations, sizes
    { tag: tags.labelName,    color: '#d2a8ff', fontWeight: 'bold' }, // [block-labels]
    { tag: tags.variableName, color: '#ff9580' },                     // {style: tags}
  ]),
);

// ── Light theme ───────────────────────────────────────────────────────────────
export const lightHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword,      color: '#6e40c9', fontWeight: 'bold' },
    { tag: tags.comment,      color: '#8b949e', fontStyle: 'italic' },
    { tag: tags.string,       color: '#116329' },
    { tag: tags.typeName,     color: '#0550ae', fontWeight: 'bold' },
    { tag: tags.link,         color: '#953800' },
    { tag: tags.atom,         color: '#953800' },
    { tag: tags.number,       color: '#0550ae' },
    { tag: tags.labelName,    color: '#8250df', fontWeight: 'bold' },
    { tag: tags.variableName, color: '#cf222e' },
  ]),
);

// ── Error line decoration ─────────────────────────────────────────────────────
export const errorLineTheme = EditorView.baseTheme({
  '.cm-error-line': {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    borderLeft: '3px solid #f85149',
  },
});
