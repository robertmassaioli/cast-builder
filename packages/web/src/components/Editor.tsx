/**
 * CodeMirror 6 editor component for .castscript files.
 */
import { useEffect, useRef } from 'preact/hooks';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { castscriptLanguage } from '../editor/language.js';
import { castscriptHighlight } from '../editor/highlight.js';
import { castscriptAutocomplete } from '../editor/autocomplete.js';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  errorLine?: number;
}

export function Editor({ value, onChange, errorLine }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          castscriptLanguage,
          castscriptHighlight,
          castscriptAutocomplete,
          updateListener,
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px' },
            '.cm-scroller': { overflow: 'auto', fontFamily: 'monospace' },
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
  }, []);

  // Sync external value changes (e.g. loading an example)
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

  // Highlight error line
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !errorLine) return;
    try {
      const line = view.state.doc.line(errorLine);
      view.dispatch({
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      });
    } catch {
      // Line out of range — ignore
    }
  }, [errorLine]);

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', overflow: 'hidden' }}
    />
  );
}
