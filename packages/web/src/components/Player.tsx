import { useEffect, useRef } from 'preact/hooks';
import * as s from './Player.css.js';

// asciinema-player ships CJS + ESM; import the create function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const AsciinemaPlayer: any;

interface PlayerProps {
  castContent: string | null;
  speed: number;
}

export function Player({ castContent, speed }: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ dispose?: () => void } | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Dynamically import asciinema-player to allow chunk splitting
    import('asciinema-player').then((mod) => {
      const createPlayer = mod.create ?? mod.default?.create;
      if (!containerRef.current || !castContent || !createPlayer) return;

      // Clean up previous player
      playerRef.current?.dispose?.();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

      const blob = new Blob([castContent], { type: 'text/plain' });
      blobUrlRef.current = URL.createObjectURL(blob);

      // Clear container
      containerRef.current.innerHTML = '';

      playerRef.current = createPlayer(blobUrlRef.current, containerRef.current, {
        autoPlay: true,
        speed,
        fit: 'width',
        theme: 'monokai',
      });
    });

    return () => {
      playerRef.current?.dispose?.();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [castContent, speed]);

  if (!castContent) {
    return (
      <div class={s.placeholder}>
        <div class={s.placeholderInner}>
          <span class={s.placeholderIcon}>▶</span>
          <p>Your compiled recording will appear here</p>
          <p class={s.placeholderText}>Edit the script on the left to get started</p>
        </div>
      </div>
    );
  }

  return <div class={s.playerContainer} ref={containerRef} />;
}
