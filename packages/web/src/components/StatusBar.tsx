import * as s from './StatusBar.css.js';

interface StatusBarProps {
  state: 'ok' | 'error' | 'neutral';
  text: string;
  castContent: string | null;
  source: string;
  showSaved: boolean;
  onSave: () => void;
  shareState: 'idle' | 'copied' | 'too-large';
  onShare: () => void;
}

export function StatusBar({ state, text, castContent, source, showSaved, onSave, shareState, onShare }: StatusBarProps) {
  const stateClass = state === 'ok' ? s.statusOk : state === 'error' ? s.statusError : s.statusNeutral;

  const download = () => {
    if (!castContent) return;
    const blob = new Blob([castContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.cast';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = () => {
    if (castContent) navigator.clipboard.writeText(castContent);
  };

  const downloadScript = () => {
    const blob = new Blob([source], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.castscript';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class={`${s.statusBar} ${stateClass}`}>
      <span class={s.statusText}>{text}</span>
      <div class={s.statusActions}>
        <button onClick={downloadScript} title="Download .castscript">⬇ Script</button>
        <button onClick={download} disabled={!castContent} title="Download .cast file">⬇ .cast</button>
        <button onClick={copy} disabled={!castContent} title="Copy .cast to clipboard">📋 Copy</button>
        <button
          onClick={onShare}
          disabled={shareState === 'too-large'}
          title={shareState === 'too-large' ? 'Script too large to share as a URL' : 'Copy share link to clipboard'}
        >
          {shareState === 'copied' ? '✓ Copied!' : shareState === 'too-large' ? '🔗 Too Large' : '🔗 Share'}
        </button>
        <button onClick={onSave} title={showSaved ? 'Hide saved scripts' : 'Manage saved scripts'}>
          💾 {showSaved ? 'Hide Saved' : 'Saved Scripts'}
        </button>
      </div>
    </div>
  );
}
