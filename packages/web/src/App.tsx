import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { Editor } from './components/Editor.js';
import { Player } from './components/Player.js';
import { Footer } from './components/Footer.js';
import { ExamplesMenu } from './components/ExamplesMenu.js';
import { compileScript, debounce, type CompileResult } from './compiler/compile.js';
import {
  getCurrentScript,
  setCurrentScript,
  getTheme,
  setTheme as saveTheme,
  getPlayerSpeed,
  setPlayerSpeed,
  type Theme,
} from './storage/localStorage.js';
import { darkTheme, lightTheme } from './theme.css.js';
import * as s from './App.css.js';

const DEBOUNCE_MS = 400;
const SPEEDS = [0.5, 1, 1.5, 2] as const;

type CompileState =
  | { status: 'idle' }
  | { status: 'compiling' }
  | ({ status: 'ok' } & Extract<CompileResult, { ok: true }>)
  | ({ status: 'error' } & Extract<CompileResult, { ok: false }>);

export function App() {
  const [source, setSource] = useState(() => getCurrentScript());
  const [compileState, setCompileState] = useState<CompileState>({ status: 'idle' });
  const [showSaved, setShowSaved] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getTheme());
  const [speed, setSpeed] = useState<number>(() => getPlayerSpeed());
  const [splitPct, setSplitPct] = useState(50);
  const dragging = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Apply theme class to body
  useEffect(() => {
    document.body.className = theme === 'dark' ? darkTheme : lightTheme;
    saveTheme(theme);
  }, [theme]);

  // Debounced compile
  const doCompile = useCallback(
    debounce(async (src: string) => {
      setCompileState({ status: 'compiling' });
      const r = await compileScript(src);
      if (r.ok) {
        setCompileState({ status: 'ok', ...r });
      } else {
        setCompileState({ status: 'error', ...r });
      }
    }, DEBOUNCE_MS),
    [],
  );

  // Compile on source change
  useEffect(() => {
    setCurrentScript(source);
    doCompile(source);
  }, [source, doCompile]);

  // Ctrl/Cmd+Enter — immediate compile
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        compileScript(source).then((r) => {
          if (r.ok) {
            setCompileState({ status: 'ok', ...r });
          } else {
            setCompileState({ status: 'error', ...r });
          }
        });
      }
    },
    [source],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Panel resize drag
  const onMouseDown = useCallback(() => { dragging.current = true; }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.max(20, Math.min(80, pct)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const castContent = compileState.status === 'ok' ? compileState.cast : null;

  const statusText =
    compileState.status === 'ok'
      ? `✔ ${compileState.eventCount} events · ${compileState.totalSeconds.toFixed(1)}s · compiled in ${compileState.durationMs}ms`
      : compileState.status === 'error'
      ? `✘ ${compileState.message}`
      : compileState.status === 'compiling'
      ? 'Compiling…'
      : 'Ready — edit the script to compile';

  const statusState =
    compileState.status === 'ok' ? 'ok'
    : compileState.status === 'error' ? 'error'
    : 'neutral';

  return (
    <div class={s.appRoot}>
      {/* Header */}
      <header class={s.header}>
        <div class={s.appTitle}>
          <span class={s.logo}>▶</span>
          cast-builder
          <em class={s.subtitle}>live editor</em>
        </div>
        <div class={s.headerActions}>
          <ExamplesMenu onSelect={setSource} />
          <button
            class={s.themeToggle}
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title="Toggle dark/light theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <a
            class={s.githubLink}
            href="https://github.com/robertmassaioli/cast-builder"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </header>

      {/* Main panels */}
      <main class={s.appMain} ref={mainRef}>
        {/* Editor panel */}
        <div
          class={s.panel}
          style={{ flexBasis: `${splitPct}%`, flexShrink: 0, flexGrow: 0 }}
        >
          <div class={s.panelLabel}>
            <span>📝 .castscript</span>
            <span class={s.shortcutHint}>Ctrl+Enter to compile</span>
          </div>
          <div class={s.panelBody}>
            <Editor
              value={source}
              onChange={setSource}
              errorLine={compileState.status === 'error' ? compileState.line : undefined}
            />
          </div>
        </div>

        {/* Resize handle */}
        <div class={s.resizeHandle} onMouseDown={onMouseDown} />

        {/* Player panel */}
        <div class={s.panel} style={{ flex: 1, minWidth: 0 }}>
          <div class={s.panelLabel}>
            <span>▶ Preview</span>
            <div class={s.speedControls}>
              {SPEEDS.map((sp) => (
                <button
                  key={sp}
                  class={`${s.speedBtn}${speed === sp ? ` ${s.speedBtnActive}` : ''}`}
                  onClick={() => { setSpeed(sp); setPlayerSpeed(sp); }}
                >
                  {sp}×
                </button>
              ))}
            </div>
          </div>
          <div class={s.playerBody}>
            <Player castContent={castContent} speed={speed} />
          </div>
        </div>
      </main>

      {/* Footer: status bar + saved scripts panel */}
      <Footer
        state={statusState}
        text={statusText}
        castContent={castContent}
        source={source}
        showSaved={showSaved}
        onToggleSaved={() => setShowSaved((v) => !v)}
        onLoad={setSource}
      />
    </div>
  );
}
