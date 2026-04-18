import { useState } from 'preact/hooks';
import {
  getSavedScripts,
  saveScript,
  deleteSavedScript,
  renameSavedScript,
} from '../storage/localStorage.js';
import * as s from './SavedScripts.css.js';

interface SavedScriptsProps {
  currentSource: string;
  onLoad: (src: string) => void;
}

export function SavedScripts({ currentSource, onLoad }: SavedScriptsProps) {
  const [slots, setSlots] = useState(() => getSavedScripts());
  const [name, setName] = useState('');
  const [saveError, setSaveError] = useState('');

  const refresh = () => setSlots(getSavedScripts());

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) { setSaveError('Name required'); return; }
    if (slots.some((sl) => sl.name === trimmed)) { setSaveError(`"${trimmed}" already exists`); return; }
    saveScript(trimmed, currentSource);
    setName('');
    setSaveError('');
    refresh();
  };

  const load = (slotName: string) => {
    const slot = getSavedScripts().find((sl) => sl.name === slotName);
    if (slot) onLoad(slot.script);
  };

  const del = (slotName: string) => {
    deleteSavedScript(slotName);
    refresh();
  };

  const rename = (oldName: string) => {
    const newName = prompt(`Rename "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;
    renameSavedScript(oldName, newName);
    refresh();
  };

  return (
    <div class={s.container}>
      <div class={s.saveRow}>
        <input
          class={s.nameInput}
          type="text"
          placeholder="Script name…"
          value={name}
          onInput={(e) => { setName((e.target as HTMLInputElement).value); setSaveError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        />
        <button onClick={save}>Save current</button>
        {saveError && <span class={s.saveError}>{saveError}</span>}
      </div>

      {slots.length === 0 ? (
        <p class={s.emptyMessage}>No saved scripts yet.</p>
      ) : (
        <div class={s.slotList}>
          {slots.map(({ name: n }) => (
            <div key={n} class={s.slot}>
              <button class={s.loadBtn} onClick={() => load(n)}>{n}</button>
              <button class={s.slotIconBtn} onClick={() => rename(n)} title="Rename">✏️</button>
              <button class={`${s.slotIconBtn} ${s.dangerBtn}`} onClick={() => del(n)} title="Delete">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
