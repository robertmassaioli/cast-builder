/**
 * Examples dropdown menu.
 */
import { useState } from 'preact/hooks';
import { EXAMPLES } from '../examples/index.js';
import { setLastExample } from '../storage/localStorage.js';

interface ExamplesMenuProps {
  currentScript: string;
  onLoad: (script: string, name: string) => void;
}

export function ExamplesMenu({ currentScript, onLoad }: ExamplesMenuProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(name: string, script: string) {
    setOpen(false);
    if (
      currentScript.trim() &&
      !confirm(`Load example "${name}"? Your current script will be replaced.`)
    ) return;
    setLastExample(name);
    onLoad(script, name);
  }

  return (
    <div class="examples-menu">
      <button class="examples-trigger" onClick={() => setOpen((v) => !v)}>
        Examples ▾
      </button>
      {open && (
        <div class="examples-dropdown">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.name}
              class="example-item"
              onClick={() => handleSelect(ex.name, ex.script)}
            >
              <span class="example-name">{ex.name}</span>
              <span class="example-desc">{ex.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
