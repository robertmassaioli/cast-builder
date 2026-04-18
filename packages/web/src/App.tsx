/**
 * Root application component.
 * Implements Phases 0–2: editor, live compile, player, localStorage persistence.
 */
import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { Editor } from './components/Editor.js';
import { Player } from './components/Player.js';
import { StatusBar } from './components/StatusBar.js';
import { SavedScripts } from './components/SavedScripts.js';
import { ExamplesMenu } from './components/ExamplesMenu.js';
import { compileScript, debounce, type CompileResult } from './compiler/compile.js';
import {
  getCurrentScript,
  setCurrentScript,
  getTheme,
  setTheme,
  type Theme,
} from './storage/localStorage.js';
import { EXAMPLES } from './examples/index.js';

const DEBOUNCE_MS = 500;

const DEFAULT_SCRIPT = EXAMPLES[0]?.script ?? '';

export function App() {
  const [script, setScript] = useState<string>(() => {
    const saved = getCurrentScript();
    return saved.trim() ? saved : DEFAULT_SCRIPT;
  });
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [showSaved, setShowSaved] = useState(false);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Compile function
  const runCompile = useCallback(async (src: string) => {
    setIsCompiling(true);
    const result = await compileScript(src);
    setCompileResult(result);
    setIsCompiling(false);
  }, []);

  // Debounced compile on edit
  const debouncedCompile = useRef(
    debounce((src: string) => { void runCompile(src); }, DEBOUNCE_MS),
  ).current;

  // Compile on mount
  useEffect(() => {
    void runCompile(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScriptChange(newScript: string) {
    setScript(newScript);
    setCurrentScript(newScript); // auto-save to localStorage
    debouncedCompile(newScript);
  }

  function handleLoadScript(newScript: string) {
    setScript(newScript);
    setCurrentScript(newScript);
    void runCompile(newScript);
  }

  function handleThemeToggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  }

  function handleDownload() {
    if (!compileResult?.ok) return;
    const title = script.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? 'recording';
    const safe = title.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
    const blob = new Blob([compileResult.cast], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe}.cast`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(script);
  }

  const errorLine = compileResult?.ok === false ? compileResult.line : undefined;
  const castOutput = compileResult?.ok ? compileResult.cast : null;

  return (
    <div class="app">
      {/* Header */}
      <header class="app-header">
        <div class="app-title">
          <span class="logo">▶</span>
          <span>cast-builder <em>live editor</em></span>
        </div>
        <div class="header-actions">
          <ExamplesMenu currentScript={script} onLoad={handleLoadScript} />
          <button class="icon-btn" onClick={handleThemeToggle} title="Toggle theme">
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
          <a
            href="https://github.com/robertmassaioli/cast-builder"
            target="_blank"
            rel="noreferrer"
            class="github-link"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main panels */}
      <main class="app-main">
        <div class="editor-panel">
          <Editor
            value={script}
            onChange={handleScriptChange}
            errorLine={errorLine}
          />
        </div>
        <div class="player-panel">
          <Player cast={castOutput} />
        </div>
      </main>

      {/* Status bar */}
      <StatusBar
        result={compileResult}
        isCompiling={isCompiling}
        onCompile={() => { void runCompile(script); }}
        onDownload={handleDownload}
        onCopy={() => { void handleCopy(); }}
        onSave={() => setShowSaved((v) => !v)}
      />

      {/* Saved scripts panel */}
      {showSaved && (
        <SavedScripts
          currentScript={script}
          onLoad={handleLoadScript}
        />
      )}
    </div>
  );
}
