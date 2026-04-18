/**
 * CodeMirror 6 editor component for .castscript files.
 * Phase 3: context-aware highlighting, error line decoration, theme support.
 * Phase 4: keyboard shortcuts (Ctrl/Cmd+Enter to compile).
 */
import { useEffect, useRef } from 'preact/hooks';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { castscriptLanguage } from '../editor/language.js';
import { darkHighlight, lightHighlight, errorLineTheme } from '../editor/highlight.js';
import { castscriptAutocomplete } from '../editor/autocomplete.js';
import { errorLineField, setErrorLine } from '../editor/errorDecoration.js';
import type { Theme } from '../storage/localStorage.js';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onCompile: () => void;
  errorLine?: number;
  theme: Theme;
}

export function Editor({ value, onChange, onCompile, errorLine, theme }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    // Ctrl+Enter / Cmd+Enter → trigger compile
    const compileKeymap = keymap.of([
      {
        key: 'Ctrl-Enter',
        mac: 'Cmd-Enter',
        run: () => { onCompile(); return true; },
      },
    ]);

    const highlight = theme === 'dark' ? darkHighlight : lightHighlight;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          castscriptLanguage,
          highlight,
          errorLineTheme,
          errorLineField,
          castscriptAutocomplete,
          compileKeymap,
          keymap.of(defaultKeymap),
          updateListener,
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '13px',
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--text)',
            },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            },
            '.cm-gutters': {
              backgroundColor: 'var(--bg-panel)',
              borderRight: '1px solid var(--border)',
              color: 'var(--text-muted)',
            },
            '.cm-activeLineGutter': { backgroundColor: 'var(--bg-input)' },
            '.cm-activeLine': { backgroundColor: 'var(--bg-input)' },
            '.cm-cursor': { borderLeftColor: 'var(--accent)' },
            '.cm-selectionBackground': { backgroundColor: 'var(--accent-dim) !important' },
            '.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--accent-dim) !important' },
            '.cm-tooltip': {
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
            },
            '.cm-tooltip-autocomplete ul li[aria-selected]': {
              backgroundColor: 'var(--accent-dim)',
              color: 'var(--text)',
            },
          }),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only create once on mount

  // Sync external value changes (e.g. loading an example or saved script)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  // Update error line decoration
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: setErrorLine.of(errorLine ?? null),
    });
  }, [errorLine]);

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', overflow: 'hidden' }}
    />
  );
}
