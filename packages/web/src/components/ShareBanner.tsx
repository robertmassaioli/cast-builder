import * as s from './ShareBanner.css.js';

interface ShareBannerProps {
  sharedScript: string;
  missingDeps: string[];
  onAccept: (script: string) => void;
  onDismiss: () => void;
}

export function ShareBanner({ sharedScript, missingDeps, onAccept, onDismiss }: ShareBannerProps) {
  return (
    <div class={s.banner}>
      <div class={s.message}>
        <span class={s.icon}>📎</span>
        <div>
          <span>A shared script was linked — do you want to load it?</span>
          {missingDeps.length > 0 && (
            <div class={s.depList}>
              ⚠️ Uses include/file directives: {missingDeps.join(', ')} — save these scripts locally for full compilation.
            </div>
          )}
        </div>
      </div>
      <div class={s.actions}>
        <button class={s.acceptBtn} onClick={() => onAccept(sharedScript)}>
          Use shared script
        </button>
        <button class={s.dismissBtn} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
