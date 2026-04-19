/**
 * Monaco Editor component for .castscript files.
 *
 * Features:
 *  - Full VS Code editing experience (find/replace, multi-cursor, etc.)
 *  - .castscript Monarch syntax highlighting
 *  - Context-aware completions + hover docs
 *  - cast-dark / cast-light themes (no editor rebuild on switch)
 *  - Error line decoration (red background + gutter icon)
 *  - automaticLayout: true — handles panel resize automatically
 */
import { useEffect, useRef } from 'preact/hooks';
import type * as MonacoType from 'monaco-editor';
import { registerCastscript } from '../monaco/castscript.js';
import type { Theme } from '../storage/localStorage.js';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onCompile: () => void;
  errorLine?: number;
  theme: Theme;
}

type MonacoEditor = MonacoType.editor.IStandaloneCodeEditor;
type IDisposable = MonacoType.IDisposable;

// Decoration collection ID — stable across updates
const ERROR_DECORATION_CLASS = 'castscript-error-line';

export function Editor({ value, onChange, onCompile, errorLine, theme }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<typeof MonacoType | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const listenerRef = useRef<IDisposable | null>(null);

  // ── Mount: dynamically import Monaco, register language, create editor ──────
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    import('monaco-editor').then((monaco) => {
      if (destroyed || !containerRef.current) return;
      monacoRef.current = monaco;

      // Register .castscript language (idempotent)
      registerCastscript(monaco);

      // Add global CSS for error line decoration
      const styleId = 'castscript-error-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .${ERROR_DECORATION_CLASS} { background: rgba(248, 81, 73, 0.15); }
          .${ERROR_DECORATION_CLASS}-gutter {
            background: #f85149;
            width: 3px !important;
            margin-left: 3px;
          }
        `;
        document.head.appendChild(style);
      }

      const editor = monaco.editor.create(containerRef.current!, {
        value,
        language: 'castscript',
        theme: theme === 'dark' ? 'cast-dark' : 'cast-light',
        fontSize: 13,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        fontLigatures: true,
        lineNumbers: 'on',
        minimap: { enabled: false },
        automaticLayout: true,     // handles panel resize
        scrollBeyondLastLine: false,
        wordWrap: 'off',
        tabSize: 2,
        insertSpaces: true,
        folding: true,
        foldingStrategy: 'indentation',
        bracketPairColorization: { enabled: true },
        matchBrackets: 'always',
        renderWhitespace: 'selection',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        padding: { top: 8, bottom: 8 },
        // Find widget
        find: { addExtraSpaceOnTop: false },
      });

      // Ctrl/Cmd+Enter → compile
      editor.addAction({
        id: 'castscript.compile',
        label: 'Compile castscript',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        ],
        run: () => { onCompile(); },
      });

      // Listen for content changes
      listenerRef.current = editor.onDidChangeModelContent(() => {
        onChange(editor.getValue());
      });

      editorRef.current = editor;
    });

    return () => {
      destroyed = true;
      listenerRef.current?.dispose();
      editorRef.current?.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Create once on mount

  // ── Sync external value (loading examples / saved scripts) ─────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() !== value) {
      // Preserve undo history with executeEdits
      const model = editor.getModel();
      if (model) {
        editor.executeEdits('external-update', [{
          range: model.getFullModelRange(),
          text: value,
          forceMoveMarkers: true,
        }]);
        editor.setScrollPosition({ scrollTop: 0 });
      }
    }
  }, [value]);

  // ── Theme switching — no editor rebuild ─────────────────────────────────────
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    monaco.editor.setTheme(theme === 'dark' ? 'cast-dark' : 'cast-light');
  }, [theme]);

  // ── Error line decoration ───────────────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    if (errorLine == null) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    const lineCount = model.getLineCount();
    const line = Math.min(errorLine, lineCount);

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: {
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: model.getLineMaxColumn(line),
        },
        options: {
          isWholeLine: true,
          className: ERROR_DECORATION_CLASS,
          glyphMarginClassName: `${ERROR_DECORATION_CLASS}-gutter`,
          overviewRuler: {
            color: '#f85149',
            position: 4, // OverviewRulerLane.Right
          },
        },
      },
    ]);

    // Scroll the error line into view
    editor.revealLineInCenter(line);
  }, [errorLine]);

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', width: '100%' }}
    />
  );
}
