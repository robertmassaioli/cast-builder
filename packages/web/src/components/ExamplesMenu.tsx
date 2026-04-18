import { useState, useEffect, useRef } from 'preact/hooks';
import { EXAMPLES } from '../examples/index.js';
import * as s from './ExamplesMenu.css.js';

interface ExamplesMenuProps {
  onSelect: (src: string) => void;
}

export function ExamplesMenu({ onSelect }: ExamplesMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div class={s.menu} ref={ref}>
      <button class={s.trigger} onClick={() => setOpen(o => !o)}>
        Examples ▾
      </button>
      {open && (
        <div class={s.dropdown}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.name}
              class={s.item}
              onClick={() => { onSelect(ex.content); setOpen(false); }}
            >
              <span class={s.itemName}>{ex.name}</span>
              <span class={s.itemDesc}>{ex.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
