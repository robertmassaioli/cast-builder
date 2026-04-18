/**
 * asciinema-player wrapper component.
 */
import { useEffect, useRef } from 'preact/hooks';
import * as AsciinemaPlayer from 'asciinema-player';
import 'asciinema-player/dist/bundle/asciinema-player.css';

interface PlayerProps {
  cast: string | null;   // NDJSON asciicast v3 string, or null if no compile yet
  speed?: number;
}

export function Player({ cast, speed = 1 }: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ dispose?: () => void } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !cast) return;

    // Dispose previous player instance
    playerRef.current?.dispose?.();

    // Create a blob URL from the cast NDJSON string
    const blob = new Blob([cast], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const player = AsciinemaPlayer.create(url, containerRef.current, {
      autoPlay: true,
      speed,
      fit: 'width',
      theme: 'monokai',
    });

    playerRef.current = player;

    return () => {
      player?.dispose?.();
      URL.revokeObjectURL(url);
    };
  }, [cast, speed]);

  if (!cast) {
    return (
      <div class="player-placeholder">
        <div class="player-placeholder-inner">
          <span>▶</span>
          <p>Your compiled recording will appear here.</p>
          <p>Start typing in the editor to compile.</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%' }} />;
}
