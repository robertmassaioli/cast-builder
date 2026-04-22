/**
 * DocModal — in-browser castscript language reference.
 * Opened by the "Docs" button in the app header.
 * Clicking the overlay or pressing Escape closes it.
 */
import { useEffect } from 'preact/hooks';
import * as s from './DocModal.css.js';

interface DocModalProps {
  onClose: () => void;
}

export function DocModal({ onClose }: DocModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      class={s.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="castscript language reference"
    >
      <div class={s.modal}>
        <div class={s.modalHeader}>
          <span class={s.modalTitle}>📖 castscript language reference</span>
          <button class={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div class={s.modalBody}>
          <p>
            A <code>.castscript</code> file has two sections: <code>--- config ---</code> and{' '}
            <code>--- script ---</code>. Both sections are optional — a file with only a script
            section uses all defaults.
          </p>

          <pre>{`--- config ---
title:        My Demo
width:        120
height:       30
prompt:       user@host:~/project$ 
typing-speed: normal
idle-time:    1.0

--- script ---

marker: Start

$ echo "Hello, world!"
> Hello, world!

wait: 1s
clear`}</pre>

          {/* ── Config ─────────────────────────────────────────────────── */}
          <h2>Config section</h2>
          <p>
            All keys are optional. Values align with spaces for readability — alignment whitespace is
            stripped automatically.
          </p>
          <table>
            <thead>
              <tr><th>Key</th><th>Default</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>title</code></td><td>—</td><td>Recording title shown in the player</td></tr>
              <tr><td><code>width</code></td><td><code>120</code></td><td>Terminal width in columns</td></tr>
              <tr><td><code>height</code></td><td><code>30</code></td><td>Terminal height in rows</td></tr>
              <tr><td><code>shell</code></td><td><code>bash</code></td><td>Shell name (stored in header)</td></tr>
              <tr><td><code>prompt</code></td><td><code>$ </code></td><td>Prompt prepended before each <code>$</code> command. Trailing space is significant. Supports inline style tags.</td></tr>
              <tr><td><code>theme</code></td><td><code>default</code></td><td>Theme name (stored in header)</td></tr>
              <tr><td><code>typing-speed</code></td><td><code>normal</code></td><td><code>slow</code> · <code>normal</code> · <code>fast</code> · <code>instant</code> · <code>Nms</code> (e.g. <code>60ms</code>)</td></tr>
              <tr><td><code>typing-seed</code></td><td>random</td><td>RNG seed — set for fully reproducible timing</td></tr>
              <tr><td><code>idle-time</code></td><td><code>1.0</code></td><td>Seconds of pause inserted between command blocks</td></tr>
              <tr><td><code>output-format</code></td><td><code>v3</code></td><td><code>v3</code> (delta timestamps, recommended) or <code>v2</code> (absolute)</td></tr>
              <tr><td><code>env</code></td><td>—</td><td><code>KEY=VALUE</code> stored in the cast header. Repeat for multiple entries.</td></tr>
            </tbody>
          </table>

          {/* ── Script directives ──────────────────────────────────────── */}
          <h2>Script directives</h2>
          <p>
            One directive per line. Blank lines and <code>#</code> comment lines are ignored.
          </p>

          <h3>Commands &amp; output</h3>
          <table>
            <thead>
              <tr><th>Directive</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>$ command</code></td>
                <td>Type the command at the prompt with a realistic typing animation, then press Enter. The <code>idle-time</code> gap is inserted before every command after the first.</td>
              </tr>
              <tr>
                <td><code>{'>'} text</code></td>
                <td>Print an output line. Supports inline style tags. A small timing delay between lines simulates real command output.</td>
              </tr>
              <tr>
                <td><code>{'>> path/to/file'}</code></td>
                <td>Embed the contents of a file as output lines. Requires a FileResolver (in the web editor, save the file by name in Saved Scripts).</td>
              </tr>
            </tbody>
          </table>

          <h3>Text input</h3>
          <table>
            <thead>
              <tr><th>Directive</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>type: text</code></td><td>Type text with animation but <strong>without</strong> pressing Enter. Useful for interactive prompts.</td></tr>
              <tr><td><code>hidden: text</code></td><td>Type text with timing but <strong>without echoing</strong> it (e.g. passwords). Only a newline is visible.</td></tr>
              <tr><td><code>print: text</code></td><td>Instantly emit text with no typing animation. Supports inline style tags.</td></tr>
            </tbody>
          </table>

          <h3>Timing &amp; control</h3>
          <table>
            <thead>
              <tr><th>Directive</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>wait: 2s</code></td><td>Insert a pause. Use <code>s</code> for seconds or <code>ms</code> for milliseconds — e.g. <code>wait: 500ms</code>, <code>wait: 1.5s</code>.</td></tr>
              <tr><td><code>clear</code></td><td>Clear the terminal screen.</td></tr>
              <tr><td><code>resize: 80x24</code></td><td>Change terminal dimensions mid-recording (<code>cols×rows</code>).</td></tr>
              <tr><td><code>marker: Label</code></td><td>Insert a named chapter marker visible in the asciinema player timeline.</td></tr>
            </tbody>
          </table>

          <h3>Mid-script overrides</h3>
          <table>
            <thead>
              <tr><th>Directive</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>set typing-speed: fast</code></td><td>Override typing speed from this point onward.</td></tr>
              <tr><td><code>set prompt: root@host:~# </code></td><td>Change the prompt for subsequent <code>$</code> commands.</td></tr>
              <tr><td><code>set idle-time: 0.5</code></td><td>Change the between-command pause.</td></tr>
              <tr><td><code>set title: New Title</code></td><td>Update the title (informational).</td></tr>
            </tbody>
          </table>

          <h3>Includes &amp; blocks</h3>
          <table>
            <thead>
              <tr><th>Directive</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>[block-name]</code></td><td>Define a named block. All directives from this label to the next (or end of file) belong to the block.</td></tr>
              <tr><td><code>include: other.castscript</code></td><td>Inline the full content of another script file.</td></tr>
              <tr><td><code>include: other.castscript#block</code></td><td>Inline only the named block from another file. Nesting up to 16 levels deep is supported.</td></tr>
            </tbody>
          </table>

          <h3>Raw ANSI</h3>
          <table>
            <thead>
              <tr><th>Directive</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>raw: \x1b[1mBold\x1b[0m</code></td>
                <td>
                  Emit a raw ANSI/VT100 escape sequence verbatim. Use for effects not covered by
                  style tags: blinking (<code>\x1b[5m</code>), 256-colour codes, cursor
                  positioning, etc. Supports <code>\xNN</code>, <code>\n</code>, <code>\r</code>,{' '}
                  <code>\t</code>, <code>\\</code>.
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Inline style tags ──────────────────────────────────────── */}
          <h2>Inline style tags</h2>
          <p>
            Use <code>{'{'}{`modifier …: content`}{'}'}</code> inside <code>{'>'}</code> output lines and
            <code>print:</code> directives to apply colours and styles without writing raw ANSI
            codes.
          </p>
          <pre>{`> Status: {bold green: OK}
> {red: Error}: something went wrong
> {#ff6600: True-colour orange}
> {bold: {underline: nested styles}}`}</pre>

          <h3>Text modifiers</h3>
          <table>
            <thead><tr><th>Modifier</th><th>Effect</th></tr></thead>
            <tbody>
              <tr><td><code>bold</code></td><td>Bold</td></tr>
              <tr><td><code>dim</code></td><td>Dimmed / faint</td></tr>
              <tr><td><code>italic</code></td><td>Italic</td></tr>
              <tr><td><code>underline</code></td><td>Underline</td></tr>
            </tbody>
          </table>

          <h3>Foreground colours</h3>
          <p>
            <code>black</code> · <code>red</code> · <code>green</code> · <code>yellow</code> ·{' '}
            <code>blue</code> · <code>magenta</code> · <code>cyan</code> · <code>white</code> ·{' '}
            <code>#rrggbb</code> (24-bit hex)
          </p>

          <h3>Background colours</h3>
          <p>
            <code>bg-black</code> · <code>bg-red</code> · <code>bg-green</code> ·{' '}
            <code>bg-yellow</code> · <code>bg-blue</code> · <code>bg-magenta</code> ·{' '}
            <code>bg-cyan</code> · <code>bg-white</code>
          </p>
          <p>
            Multiple modifiers can be combined in any order:{' '}
            <code>{'{bold red: text}'}</code>, <code>{'{bold bg-blue: text}'}</code>,{' '}
            <code>{'{italic #00aaff: text}'}</code>.
          </p>

          {/* ── Typing speed ───────────────────────────────────────────── */}
          <h2>Typing speed values</h2>
          <table>
            <thead><tr><th>Value</th><th>Avg delay per character</th></tr></thead>
            <tbody>
              <tr><td><code>instant</code></td><td>0 ms — no animation</td></tr>
              <tr><td><code>fast</code></td><td>~30 ms</td></tr>
              <tr><td><code>normal</code></td><td>~80 ms</td></tr>
              <tr><td><code>slow</code></td><td>~150 ms</td></tr>
              <tr><td><code>Nms</code></td><td>Exactly N ms — e.g. <code>60ms</code></td></tr>
            </tbody>
          </table>
          <p>
            A small random jitter (±25% of the average) is added per character to make typing look
            natural. Set <code>typing-seed</code> in the config for fully reproducible output.
          </p>

          {/* ── Comments ───────────────────────────────────────────────── */}
          <h2>Comments</h2>
          <pre>{'# This line is a comment and is completely ignored'}</pre>
          <p>Comments can appear anywhere in both the config and script sections.</p>
        </div>
      </div>
    </div>
  );
}
