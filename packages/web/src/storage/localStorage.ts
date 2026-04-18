/**
 * Typed localStorage wrappers for cast-builder live editor state.
 */

const KEYS = {
  currentScript: 'cast-builder:script',
  theme: 'cast-builder:theme',
  playerSpeed: 'cast-builder:speed',
  lastExample: 'cast-builder:examples:last',
  savedPrefix: 'cast-builder:saved:',
} as const;

export type Theme = 'light' | 'dark';

export interface SavedScript {
  name: string;
  script: string;
  savedAt: number; // Unix ms timestamp
}

// ── Current script ────────────────────────────────────────────────────────────

export function getCurrentScript(): string {
  return localStorage.getItem(KEYS.currentScript) ?? '';
}

export function setCurrentScript(script: string): void {
  localStorage.setItem(KEYS.currentScript, script);
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export function getTheme(): Theme {
  const stored = localStorage.getItem(KEYS.theme);
  return stored === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEYS.theme, theme);
}

// ── Player speed ──────────────────────────────────────────────────────────────

export function getPlayerSpeed(): number {
  const stored = localStorage.getItem(KEYS.playerSpeed);
  const parsed = stored ? parseFloat(stored) : NaN;
  return isNaN(parsed) ? 1 : parsed;
}

export function setPlayerSpeed(speed: number): void {
  localStorage.setItem(KEYS.playerSpeed, String(speed));
}

// ── Last example ──────────────────────────────────────────────────────────────

export function getLastExample(): string | null {
  return localStorage.getItem(KEYS.lastExample);
}

export function setLastExample(name: string): void {
  localStorage.setItem(KEYS.lastExample, name);
}

// ── Saved script slots (max 10) ───────────────────────────────────────────────

const MAX_SAVED = 10;

export function getSavedScripts(): SavedScript[] {
  const results: SavedScript[] = [];
  for (let i = 0; i < MAX_SAVED; i++) {
    const raw = localStorage.getItem(`${KEYS.savedPrefix}${i}`);
    if (raw) {
      try {
        results.push(JSON.parse(raw) as SavedScript);
      } catch {
        // Ignore corrupted slots
      }
    }
  }
  return results;
}

export function saveScript(name: string, script: string): boolean {
  const existing = getSavedScripts();
  // If a script with this name already exists, update it in place
  const existingIdx = existing.findIndex((s) => s.name === name);
  const slot: SavedScript = { name, script, savedAt: Date.now() };

  if (existingIdx >= 0) {
    localStorage.setItem(`${KEYS.savedPrefix}${existingIdx}`, JSON.stringify(slot));
    return true;
  }

  // Find the first empty slot
  for (let i = 0; i < MAX_SAVED; i++) {
    if (!localStorage.getItem(`${KEYS.savedPrefix}${i}`)) {
      localStorage.setItem(`${KEYS.savedPrefix}${i}`, JSON.stringify(slot));
      return true;
    }
  }

  return false; // All 10 slots full
}

export function deleteSavedScript(name: string): void {
  for (let i = 0; i < MAX_SAVED; i++) {
    const raw = localStorage.getItem(`${KEYS.savedPrefix}${i}`);
    if (raw) {
      try {
        const slot = JSON.parse(raw) as SavedScript;
        if (slot.name === name) {
          localStorage.removeItem(`${KEYS.savedPrefix}${i}`);
          return;
        }
      } catch {
        // Ignore corrupted slots
      }
    }
  }
}

export function renameSavedScript(oldName: string, newName: string): void {
  for (let i = 0; i < MAX_SAVED; i++) {
    const raw = localStorage.getItem(`${KEYS.savedPrefix}${i}`);
    if (raw) {
      try {
        const slot = JSON.parse(raw) as SavedScript;
        if (slot.name === oldName) {
          slot.name = newName;
          localStorage.setItem(`${KEYS.savedPrefix}${i}`, JSON.stringify(slot));
          return;
        }
      } catch {
        // Ignore corrupted slots
      }
    }
  }
}

/** Build a FileResolver-compatible map from all saved scripts (by name). */
export function buildSavedScriptMap(): Map<string, string> {
  return new Map(getSavedScripts().map((s) => [s.name, s.script]));
}
