import { StatusBar } from './StatusBar.js';
import { SavedScripts } from './SavedScripts.js';
import * as s from './Footer.css.js';

interface FooterProps {
  state: 'ok' | 'error' | 'neutral';
  text: string;
  castContent: string | null;
  source: string;
  showSaved: boolean;
  onToggleSaved: () => void;
  onLoad: (src: string) => void;
}

export function Footer({
  state,
  text,
  castContent,
  source,
  showSaved,
  onToggleSaved,
  onLoad,
}: FooterProps) {
  return (
    <footer class={s.footer}>
      <StatusBar
        state={state}
        text={text}
        castContent={castContent}
        source={source}
        onSave={onToggleSaved}
      />
      {showSaved && (
        <div class={s.savedPanel}>
          <SavedScripts currentSource={source} onLoad={onLoad} />
        </div>
      )}
    </footer>
  );
}
