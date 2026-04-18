/**
 * Root application component.
 * Phase 4: resizable panels, keyboard shortcut hint, improved dark/light toggle.
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
  getPlayerSpeed,
  setPlayerSpeed,
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
  const [playerSpeed, setPlayerSpeedState] = useState<number>(getPlayerSpeed);

  // Panel resize state
  const [editorWidthPct, setEditorWidthPct] = useState(50);
  const isDragging = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

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
    setCurrentScript(newScript);
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

  function handleSpeedChange(speed: number) {
    setPlayerSpeedState(speed);
    setPlayerSpeed(speed);
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

  // ── Panel resize via drag handle ──────────────────────────────────────────

  function handleDragStart(e: MouseEvent) {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current || !mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setEditorWidthPct(Math.min(80, Math.max(20, pct)));
    }
    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

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
          <button
            class="theme-toggle"
            onClick={handleThemeToggle}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
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
      <main class="app-main" ref={mainRef}>
        <div class="editor-panel" style={{ flexBasis: `${editorWidthPct}%` }}>
          <div class="editor-label">
            <span>.castscript</span>
            <span class="shortcut-hint">Ctrl+Enter to compile</span>
          </div>
          <div class="editor-body">
            <Editor
              value={script}
              onChange={handleScriptChange}
              onCompile={() => { void runCompile(script); }}
              errorLine={errorLine}
              theme={theme}
            />
          </div>
        </div>

        {/* Drag handle */}
        <div
          class="resize-handle"
          onMouseDown={handleDragStart}
          title="Drag to resize"
        />

        <div class="player-panel" style={{ flexBasis: `${100 - editorWidthPct}%` }}>
          <div class="player-label">
            <span>Preview</span>
            <div class="speed-controls">
              {[0.5, 1, 1.5, 2].map((s) => (
                <button
                  key={s}
                  class={`speed-btn ${playerSpeed === s ? 'active' : ''}`}
                  onClick={() => handleSpeedChange(s)}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
          <div class="player-body">
            <Player cast={castOutput} speed={playerSpeed} />
          </div>
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
