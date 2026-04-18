/**
 * Saved script slots panel.
 */
import { useState } from 'preact/hooks';
import {
  getSavedScripts,
  saveScript,
  deleteSavedScript,
  renameSavedScript,
  type SavedScript,
} from '../storage/localStorage.js';

interface SavedScriptsProps {
  currentScript: string;
  onLoad: (script: string) => void;
}

export function SavedScripts({ currentScript, onLoad }: SavedScriptsProps) {
  const [saved, setSaved] = useState<SavedScript[]>(() => getSavedScripts());
  const [newName, setNewName] = useState('');
  const [saveError, setSaveError] = useState('');

  function refresh() {
    setSaved(getSavedScripts());
  }

  function handleSave() {
    const name = newName.trim();
    if (!name) {
      setSaveError('Please enter a name.');
      return;
    }
    const ok = saveScript(name, currentScript);
    if (!ok) {
      setSaveError('All 10 slots are full. Delete a saved script first.');
      return;
    }
    setSaveError('');
    setNewName('');
    refresh();
  }

  function handleDelete(name: string) {
    if (!confirm(`Delete saved script "${name}"?`)) return;
    deleteSavedScript(name);
    refresh();
  }

  function handleRename(oldName: string) {
    const newNameVal = prompt(`Rename "${oldName}" to:`, oldName);
    if (!newNameVal || newNameVal === oldName) return;
    renameSavedScript(oldName, newNameVal);
    refresh();
  }

  return (
    <div class="saved-scripts">
      <div class="saved-scripts-save-row">
        <input
          type="text"
          placeholder="Script name…"
          value={newName}
          onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
        <button onClick={handleSave}>Save current</button>
        {saveError && <span class="save-error">{saveError}</span>}
      </div>

      {saved.length === 0 ? (
        <p class="saved-scripts-empty">No saved scripts yet. Type a name above and click "Save current".</p>
      ) : (
        <div class="saved-scripts-list">
          {saved.map((s) => (
            <div key={s.name} class="saved-script-slot">
              <button class="load-btn" onClick={() => onLoad(s.script)} title={`Load "${s.name}"`}>
                {s.name}
              </button>
              <button class="icon-btn" onClick={() => handleRename(s.name)} title="Rename">✎</button>
              <button class="icon-btn danger" onClick={() => handleDelete(s.name)} title="Delete">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
