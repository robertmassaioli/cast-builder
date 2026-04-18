/**
 * Status bar — shows compile status and action buttons.
 */
import type { CompileResult } from '../compiler/compile.js';

interface StatusBarProps {
  result: CompileResult | null;
  isCompiling: boolean;
  onCompile: () => void;
  onDownload: () => void;
  onCopy: () => void;
  onSave: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function StatusBar({ result, isCompiling, onCompile, onDownload, onCopy, onSave }: StatusBarProps) {
  const statusText = isCompiling
    ? '⟳ Compiling…'
    : result === null
    ? 'Ready'
    : result.ok
    ? `✔ Compiled in ${result.durationMs}ms · ${result.eventCount} events · ${formatDuration(result.totalSeconds)}`
    : `✘ Error${result.line ? ` on line ${result.line}` : ''}: ${result.message}`;

  const statusClass = result === null || isCompiling
    ? 'status-neutral'
    : result.ok
    ? 'status-ok'
    : 'status-error';

  return (
    <div class={`status-bar ${statusClass}`}>
      <span class="status-text">{statusText}</span>
      <div class="status-actions">
        <button onClick={onCompile} title="Compile now">Compile</button>
        <button onClick={onDownload} disabled={!result?.ok} title="Download .cast file">
          Download .cast
        </button>
        <button onClick={onCopy} title="Copy script to clipboard">Copy script</button>
        <button onClick={onSave} title="Save to browser storage">Save</button>
      </div>
    </div>
  );
}
