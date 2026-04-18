/**
 * CodeMirror 6 — syntax highlighting theme for .castscript.
 */
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export const castscriptHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword,      color: '#7c6af7', fontWeight: 'bold' },
    { tag: tags.comment,      color: '#6e7681', fontStyle: 'italic' },
    { tag: tags.string,       color: '#a8d8a8' },
    { tag: tags.operator,     color: '#79c0ff', fontWeight: 'bold' },
    { tag: tags.atom,         color: '#ffa657' },
    { tag: tags.labelName,    color: '#d2a8ff', fontWeight: 'bold' },
    { tag: tags.variableName, color: '#ff7b72' },
  ]),
);
