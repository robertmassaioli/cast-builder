/**
 * Monaco Editor — .castscript language definition.
 *
 * Registers:
 *  - Language ID 'castscript'
 *  - Monarch tokenizer (syntax highlighting)
 *  - Two themes: 'cast-dark' and 'cast-light'
 *  - Completion item provider (directive + config key completions)
 *  - Bracket pairs for auto-close and matching
 */
import type * as Monaco from 'monaco-editor';

export function registerCastscript(monaco: typeof Monaco): void {

  // ── Themes FIRST — must be defined before tokenizer and editor creation ────
  // Monaco caches token→colour mappings at editor creation time using whatever
  // theme is active. Define themes before registering the language/tokenizer.

  monaco.editor.defineTheme('cast-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '',            foreground: 'c9d1d9' },
      { token: 'cssection',  foreground: '7c6af7', fontStyle: 'bold' },
      { token: 'cscomment',  foreground: '6e7681', fontStyle: 'italic' },
      { token: 'csblock',    foreground: 'd2a8ff', fontStyle: 'bold' },
      { token: 'cscmd',      foreground: '79c0ff', fontStyle: 'bold' },
      { token: 'csout',      foreground: 'a8d8a8' },
      { token: 'csprint',    foreground: 'a8d8a8' },
      { token: 'csfile',     foreground: 'ffa657' },
      { token: 'csinclude',  foreground: 'ffa657', fontStyle: 'italic' },
      { token: 'cstag',      foreground: 'ff7b72' },
      { token: 'cskw',       foreground: '7c6af7' },
      { token: 'csdim',      foreground: '6e7681', fontStyle: 'italic' },
      { token: 'csraw',      foreground: 'ff7b72' },
      { token: 'cswait',     foreground: 'e3b341' },
      { token: 'csmarker',   foreground: 'd2a8ff' },
      { token: 'cskey',      foreground: 'e3b341' },
      { token: 'csdelim',    foreground: '6e7681' },
      { token: 'csnum',      foreground: 'e3b341' },
      { token: 'cstext',     foreground: 'c9d1d9' },
    ],
    colors: {
      'editor.background':            '#161b22',
      'editor.foreground':            '#c9d1d9',
      'editor.lineHighlightBackground': '#21262d',
      'editorLineNumber.foreground':  '#6e7681',
      'editorLineNumber.activeForeground': '#c9d1d9',
      'editor.selectionBackground':   '#2d2563',
      'editor.findMatchBackground':   '#2d2563',
      'editor.findMatchHighlightBackground': '#1a173a',
      'editorCursor.foreground':      '#7c6af7',
      'editorWidget.background':      '#1c2128',
      'editorWidget.border':          '#30363d',
      'input.background':             '#21262d',
      'input.border':                 '#30363d',
      'focusBorder':                  '#7c6af7',
    },
  });

  monaco.editor.defineTheme('cast-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '',            foreground: '24292f' },
      { token: 'cssection',  foreground: '6e5fdb', fontStyle: 'bold' },
      { token: 'cscomment',  foreground: '57606a', fontStyle: 'italic' },
      { token: 'csblock',    foreground: '8250df', fontStyle: 'bold' },
      { token: 'cscmd',      foreground: '0550ae', fontStyle: 'bold' },
      { token: 'csout',      foreground: '1a7f37' },
      { token: 'csprint',    foreground: '1a7f37' },
      { token: 'csfile',     foreground: 'bc4c00' },
      { token: 'csinclude',  foreground: 'bc4c00', fontStyle: 'italic' },
      { token: 'cstag',      foreground: 'cf222e' },
      { token: 'cskw',       foreground: '6e5fdb' },
      { token: 'csdim',      foreground: '57606a', fontStyle: 'italic' },
      { token: 'csraw',      foreground: 'cf222e' },
      { token: 'cswait',     foreground: '953800' },
      { token: 'csmarker',   foreground: '8250df' },
      { token: 'cskey',      foreground: '953800' },
      { token: 'csdelim',    foreground: '57606a' },
      { token: 'csnum',      foreground: '953800' },
      { token: 'cstext',     foreground: '24292f' },
    ],
    colors: {
      'editor.background':            '#ffffff',
      'editor.foreground':            '#24292f',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editorLineNumber.foreground':  '#57606a',
      'editorLineNumber.activeForeground': '#24292f',
      'editor.selectionBackground':   '#ddd9f9',
      'editor.findMatchBackground':   '#ddd9f9',
      'editor.findMatchHighlightBackground': '#ede9fc',
      'editorCursor.foreground':      '#6e5fdb',
      'editorWidget.background':      '#f6f8fa',
      'editorWidget.border':          '#d0d7de',
      'input.background':             '#ffffff',
      'input.border':                 '#d0d7de',
      'focusBorder':                  '#6e5fdb',
    },
  });

  // ── Language registration ──────────────────────────────────────────────────
  monaco.languages.register({ id: 'castscript', extensions: ['.castscript'] });

  // ── Monarch tokenizer ──────────────────────────────────────────────────────
  monaco.languages.setMonarchTokensProvider('castscript', {
    tokenPostfix: '',
    defaultToken: 'cstext',
    tokenizer: {
      root: [
        // Whole-line single-token rules
        [/^--- (config|script) ---$/, 'cssection'],
        [/^\s*#.*$/,                  'cscomment'],
        [/^\[.+\]$/,                  'csblock'],
        [/^clear$/,                   'cskw'],

        // Config keys
        [/^(title|width|height|prompt|typing-speed|idle-time|theme|output-format|typing-seed)(\s*:)(.*)$/,
          ['cskey', 'csdelim', 'cstext']],

        // wait/idle with duration
        [/^(wait|idle)(\s*:\s*)(\d+(?:\.\d+)?s|\d+ms)(.*)$/,
          ['cswait', 'csdelim', 'csnum', 'cstext']],
        [/^(wait|idle)(\s*:\s*)(.*)$/,
          ['cswait', 'csdelim', 'cstext']],

        // marker/resize
        [/^(marker|resize)(\s*:\s*)(.*)$/,
          ['csmarker', 'csdelim', 'cstext']],

        // include
        [/^(include)(\s*:\s*)(.*)$/,
          ['csinclude', 'csdelim', 'cstext']],

        // file output
        [/^(>>)(\s+)(.*)$/,
          ['csfile', 'cstext', 'csfile']],

        // type/raw/hidden
        [/^(type|raw)(\s*:\s*)(.*)$/,  ['cskw', 'csdelim', 'cstext']],
        [/^(hidden)(\s*:\s*)(.*)$/,    ['csdim', 'csdelim', 'cstext']],

        // set key: value
        [/^(set\s+)([\w-]+)(\s*:\s*)(.*)$/,
          ['cskw', 'cskey', 'csdelim', 'cstext']],

        // $ command lines — tokenize prefix + rest with style-tag sub-state
        // Use @push so the sub-state pops back to root explicitly
        [/^\$\s+/, { token: 'cscmd', next: '@cmdContent' }],

        // > output lines
        [/^>\s?/, { token: 'csout', next: '@outContent' }],

        // print: lines
        [/^print:\s*/, { token: 'csprint', next: '@outContent' }],

        // fallback
        [/.+/, 'cstext'],
      ],

      // Per-line sub-states: these use a line-start sentinel to self-terminate.
      // Any rule starting with ^ (matchOnlyAtLineStart) pops back to root
      // when a new line begins — we exploit this by adding a ^ rule that pops.
      cmdContent: [
        // If we see a line-start character that isn't part of the command,
        // pop back. We detect this by matching ^ at start of a NEW line.
        [/^\$\s+/, { token: '@rematch', next: '@pop' }],
        [/^>\s?/,  { token: '@rematch', next: '@pop' }],
        [/^(?:marker|wait|idle|include|set|print|type|hidden|raw|clear|>>|\[|#|---)\b/,
          { token: '@rematch', next: '@pop' }],
        [/\{(?:[a-z#][^:}]*):/,  { token: 'cstag', next: '@nestedTag' }],
        [/\}/,                    'cstag'],
        [/[^{}\r\n]+/,            'cscmd'],
      ],

      outContent: [
        [/^\$\s+/, { token: '@rematch', next: '@pop' }],
        [/^>\s?/,  { token: '@rematch', next: '@pop' }],
        [/^(?:marker|wait|idle|include|set|print|type|hidden|raw|clear|>>|\[|#|---)\b/,
          { token: '@rematch', next: '@pop' }],
        [/\{(?:[a-z#][^:}]*):/,  { token: 'cstag', next: '@nestedTag' }],
        [/\}/,                    'cstag'],
        [/[^{}\r\n]+/,            'csout'],
      ],

      nestedTag: [
        [/\{(?:[a-z#][^:}]*):/,  { token: 'cstag', next: '@nestedTag' }],
        [/\}/,                   { token: 'cstag', next: '@pop' }],
        [/[^{}\r\n]+/,            'csout'],
      ],
    },
  });

  // ── Language configuration (brackets, comments, auto-close) ───────────────
  monaco.languages.setLanguageConfiguration('castscript', {
    comments: {
      lineComment: '#',
    },
    brackets: [['{', '}'], ['[', ']']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: /^\$\s+/,
        end: /^(?:\$|\[|---)/,
      },
    },
  });

  // ── Completion provider ────────────────────────────────────────────────────
  monaco.languages.registerCompletionItemProvider('castscript', {
    triggerCharacters: ['-', '$', '>', '[', ':'],
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const word = model.getWordUntilPosition(position);
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Detect section
      let section: 'none' | 'config' | 'script' = 'none';
      for (let i = position.lineNumber; i >= 1; i--) {
        const l = model.getLineContent(i).trim();
        if (l === '--- script ---') { section = 'script'; break; }
        if (l === '--- config ---') { section = 'config'; break; }
      }

      const mk = (
        label: string,
        kind: Monaco.languages.CompletionItemKind,
        insertText: string,
        detail?: string,
        documentation?: string,
      ): Monaco.languages.CompletionItem => ({
        label,
        kind,
        insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        detail,
        documentation,
      });

      const K = monaco.languages.CompletionItemKind;

      // Config section completions
      if (section === 'config') {
        if (line.trim() === '' || line.match(/^[\w-]+$/)) {
          return {
            suggestions: [
              mk('title',         K.Property, 'title: ${1:My Demo}',              'Config', 'The cast title shown in the player'),
              mk('width',         K.Property, 'width: ${1:120}',                  'Config', 'Terminal width in columns'),
              mk('height',        K.Property, 'height: ${1:30}',                  'Config', 'Terminal height in rows'),
              mk('prompt',        K.Property, 'prompt: ${1:$ }',                  'Config', 'Shell prompt prefix'),
              mk('typing-speed',  K.Property, 'typing-speed: ${1|slow,normal,fast,instant|}', 'Config', 'Default typing speed'),
              mk('idle-time',     K.Property, 'idle-time: ${1:1.0}',              'Config', 'Max idle gap in seconds'),
              mk('theme',         K.Property, 'theme: ${1:monokai}',              'Config', 'Terminal colour theme name'),
              mk('output-format', K.Property, 'output-format: ${1|v3,v2|}',       'Config', 'Cast output format'),
              mk('typing-seed',   K.Property, 'typing-seed: ${1:42}',             'Config', 'RNG seed for reproducible timing'),
            ],
          };
        }

        // After typing-speed:
        if (line.match(/^typing-speed:\s*$/)) {
          return {
            suggestions: ['slow', 'normal', 'fast', 'instant'].map((s) =>
              mk(s, K.EnumMember, s, 'Typing speed'),
            ),
          };
        }
      }

      // Script section completions
      if (section === 'script') {
        if (line.trim() === '') {
          return {
            suggestions: [
              mk('$',       K.Function, '\\$ ${1:command}',        'Directive', 'Type and run a shell command'),
              mk('>',       K.Value,    '> ${1:output line}',       'Directive', 'Output line (with optional styling)'),
              mk('>>',      K.File,     '>> ${1:path/to/file.txt}', 'Directive', 'Inline file contents as output'),
              mk('print:',  K.Value,    'print: ${1:text}',         'Directive', 'Print text instantly (no typing animation)'),
              mk('type:',   K.Value,    'type: ${1:text}',          'Directive', 'Type text without pressing Enter'),
              mk('hidden:', K.Value,    'hidden: ${1:password}',    'Directive', 'Type text without echo (password)'),
              mk('wait:',   K.Event,    'wait: ${1:1s}',            'Directive', 'Pause for a duration'),
              mk('clear',   K.Keyword,  'clear',                    'Directive', 'Clear the terminal screen'),
              mk('marker:', K.Reference,'marker: ${1:label}',       'Directive', 'Insert a chapter marker'),
              mk('resize:', K.Property, 'resize: ${1:80x24}',       'Directive', 'Resize the terminal'),
              mk('raw:',    K.Constant, 'raw: ${1:\\x1b[1m}',       'Directive', 'Emit raw ANSI escape sequence'),
              mk('include:',K.Module,   'include: ${1:file.castscript}', 'Directive', 'Include another castscript file'),
              mk('set',     K.Property, 'set ${1|prompt,typing-speed,idle-time|}: ${2:value}', 'Directive', 'Override a config key mid-script'),
              mk('[block]', K.Class,    '[${1:block-name}]',        'Block',     'Named block label for selective include'),
            ],
          };
        }

        // After wait:
        if (line.match(/^wait:\s*$/)) {
          return {
            suggestions: ['500ms', '1s', '1.5s', '2s', '3s'].map((d) =>
              mk(d, K.EnumMember, d, 'Duration'),
            ),
          };
        }

        // After set
        if (line.match(/^set\s+$/)) {
          return {
            suggestions: ['prompt', 'typing-speed', 'idle-time'].map((k) =>
              mk(k, K.Property, `${k}: \${1:value}`, 'Config key'),
            ),
          };
        }

        // Inline style tags inside > or print:
        if (line.match(/^(>|print:).*\{[^}]*$/) || line.match(/\{$/)) {
          const styles = [
            'bold', 'dim', 'italic', 'underline', 'blink', 'inverse',
            'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
            'bright-red', 'bright-green', 'bright-yellow', 'bright-blue',
            'bg-red', 'bg-green', 'bg-blue', 'bg-yellow',
            'bold red', 'bold green', 'bold blue', 'bold yellow',
          ];
          return {
            suggestions: styles.map((st) =>
              mk(`{${st}: ...}`, K.Color, `{${st}: \${1:text}}`, 'Style tag'),
            ),
          };
        }
      }

      // Top-level section headers
      if (line.trim() === '' || line.startsWith('---')) {
        return {
          suggestions: [
            mk('--- config ---', K.Module, '--- config ---', 'Section header'),
            mk('--- script ---', K.Module, '--- script ---', 'Section header'),
          ],
        };
      }

      return { suggestions: [] };
    },
  });

  // ── Hover provider ─────────────────────────────────────────────────────────

  /** One entry per recognisable line pattern: [matcher, markdown doc] */
  const HOVER_DOCS: Array<[(line: string) => boolean, string]> = [
    // ── Section headers ────────────────────────────────────────────────────
    [
      (l) => l === '--- config ---',
      [
        '### `--- config ---`',
        '',
        'Opens the **config section**. All subsequent lines until `--- script ---`',
        'are treated as `key: value` config pairs.',
        '',
        '**Available keys:** `title`, `width`, `height`, `shell`, `prompt`, `theme`,',
        '`typing-speed`, `typing-seed`, `idle-time`, `output-format`, `env`',
      ].join('\n'),
    ],
    [
      (l) => l === '--- script ---',
      [
        '### `--- script ---`',
        '',
        'Opens the **script section**. All subsequent lines are directive statements.',
        'Blank lines and `#` comment lines are ignored.',
      ].join('\n'),
    ],

    // ── Script directives ──────────────────────────────────────────────────
    [
      (l) => /^\$\s/.test(l),
      [
        '### `$ command`  — Shell command',
        '',
        'Types the command at the current prompt character-by-character with a',
        'realistic typing animation, then presses Enter.',
        '',
        '- The **prompt** string (from config or last `set prompt:`) is emitted first.',
        '- An **`idle-time`** pause is inserted before every command after the first.',
        '- Typing speed is controlled by `typing-speed` / `set typing-speed:`.',
        '',
        '```',
        '$ git status',
        '$ npm run build',
        '```',
      ].join('\n'),
    ],
    [
      (l) => /^>\s?/.test(l) && !l.startsWith('>>'),
      [
        '### `> text`  — Output line',
        '',
        'Prints a line of terminal output. A small per-line timing delay (15–25 ms)',
        'is added between consecutive output lines to simulate incremental output.',
        '',
        'An empty `>` line emits a **blank line**.',
        '',
        'Supports **inline style tags:**',
        '```',
        '> Status: {bold green: OK}',
        '> {red: Error}: something went wrong',
        '> {#ff6600: True-colour orange}',
        '```',
        '',
        '**Style modifiers:** `bold`, `dim`, `italic`, `underline`  ',
        '**Colours:** `red`, `green`, `yellow`, `blue`, `cyan`, `magenta`, `white`, `#rrggbb`  ',
        '**Backgrounds:** `bg-red`, `bg-green`, `bg-blue`, `bg-yellow`, …',
      ].join('\n'),
    ],
    [
      (l) => l.startsWith('>>'),
      [
        '### `>> path/to/file`  — File output',
        '',
        'Embeds the entire contents of a file as output lines, as if a command',
        'had printed them. Each line of the file becomes one output event.',
        '',
        'Requires a **FileResolver** to be configured:',
        '- **CLI:** paths are resolved relative to the `.castscript` file (sandboxed)',
        '- **Web editor:** save the file in Saved Scripts using the same filename',
        '',
        '```',
        '>> output/build-log.txt',
        '>> data/expected-output.txt',
        '```',
      ].join('\n'),
    ],
    [
      (l) => l.startsWith('print:'),
      [
        '### `print: text`  — Instant print',
        '',
        'Instantly emits text with **no typing animation** and no per-line delay.',
        'Unlike `>`, the output appears all at once.',
        '',
        'Supports **inline style tags** (same as `>`).',
        '',
        'Use for decorative banners, section headers, or output that should',
        'appear instantaneously:',
        '',
        '```',
        'print: ╔══════════════════════╗',
        'print: {bold: Welcome to the demo}',
        'print: ╚══════════════════════╝',
        '```',
      ].join('\n'),
    ],
    [
      (l) => l.startsWith('type:'),
      [
        '### `type: text`  — Type without Enter',
        '',
        'Types text character-by-character with a typing animation, but **does not',
        'press Enter**. Useful for interactive prompts where the user types a response',
        'on the same line as the prompt.',
        '',
        '```',
        'type: Are you sure you want to continue? (yes/no) ',
        'wait: 800ms',
        'type: yes',
        '```',
      ].join('\n'),
    ],
    [
      (l) => l.startsWith('hidden:'),
      [
        '### `hidden: text`  — Hidden input (password)',
        '',
        'Advances the clock by the typing time for each character but **emits nothing**',
        'to the terminal — simulating a password field that doesn\'t echo.',
        '',
        'After all characters are "typed", emits a `\\r\\n` (Enter keypress).',
        '',
        '```',
        'type: Password: ',
        'hidden: my-secret-password',
        '> Welcome, user!',
        '```',
      ].join('\n'),
    ],
    [
      (l) => l.startsWith('wait:'),
      [
        '### `wait: duration`  — Pause',
        '',
        'Inserts an explicit pause in the recording.',
        '',
        '| Format | Example | Meaning |',
        '|--------|---------|---------|',
        '| `Ns`   | `wait: 1.5s` | N seconds (decimal OK) |',
        '| `Nms`  | `wait: 500ms` | N milliseconds (integer) |',
        '',
        '```',
        'wait: 1s',
        'wait: 500ms',
        'wait: 1.5s',
        '```',
      ].join('\n'),
    ],
    [
      (l) => l === 'clear',
      [
        '### `clear`  — Clear screen',
        '',
        'Clears the terminal screen and moves the cursor to the home position.',
        'Emits the ANSI sequence `ESC[2J ESC[H`.',
        '',
        '```',
        'wait: 1s',
        'clear',
        '$ echo "Fresh screen"',
        '```',
      ].join('\n'),
    ],
    [
      (l) => l.startsWith('marker:'),
      [
        '### `marker: label`  — Chapter marker',
        '',
        'Inserts a named chapter marker at the current time position.',
        'Markers appear in the asciinema player\'s **timeline scrubber**, allowing',
        'viewers to jump directly to named sections.',
        '',
        '```',
        'marker: Step 1 — Initialise',
        'marker: Step 2 — Build',
        'marker: Step 3 — Deploy',
        '```',
      ].join('\n'),
    ],
    [
      (l) => l.startsWith('resize:'),
      [
        '### `resize: cols×rows`  — Resize terminal',
        '',
        'Changes the terminal dimensions mid-recording. Emits an `r` event in the',
        'asciicast format. Useful for demos that involve a changing terminal size.',
        '',
        '```',
        'resize: 80x24',
        'resize: 200x50',
        '```',
      ].join('\n'),
    ],
    [
      (l) => l.startsWith('raw:'),
      [
        '### `raw: escape-sequence`  — Raw ANSI output',
        '',
        'Emits a raw ANSI/VT100 escape sequence verbatim. Use when the inline style',
        'tag system doesn\'t cover what you need.',
        '',
        '**Supported escape sequences:**',
        '- `\\xNN` — hex byte (e.g. `\\x1b` = ESC)',
        '- `\\n` — line feed',
        '- `\\r` — carriage return',
        '- `\\t` — tab',
        '- `\\\\` — literal backslash',
        '',
        '```',
        'raw: \\x1b[1;4mBold and underlined\\x1b[0m\\r\\n',
        'raw: \\x1b[38;5;208mOrange 256-colour\\x1b[0m\\r\\n',
        'raw: \\x1b[5mBlinking text\\x1b[0m\\r\\n',
        '```',
      ].join('\n'),
    ],
    [
      (l) => l.startsWith('include:'),
      [
        '### `include: path[#block]`  — Include another script',
        '',
        'Inlines the content of another `.castscript` file at the current position.',
        '',
        '| Form | Behaviour |',
        '|------|-----------|',
        '| `include: file.castscript` | Inlines the **entire** script section |',
        '| `include: file.castscript#block` | Inlines only the named `[block]` |',
        '',
        'Requires a **FileResolver**. Includes may nest up to **16 levels deep**.',
        'Circular includes are detected and rejected.',
        '',
        '```',
        'include: shared/login.castscript',
        'include: shared/setup.castscript#install',
        '```',
      ].join('\n'),
    ],
    [
      (l) => /^set\s/.test(l),
      [
        '### `set key: value`  — Mid-script config override',
        '',
        'Overrides a config key for all subsequent directives.',
        '',
        '| Key | Example |',
        '|-----|---------|',
        '| `typing-speed` | `set typing-speed: fast` |',
        '| `prompt` | `set prompt: root@server:~# ` |',
        '| `idle-time` | `set idle-time: 0.5` |',
        '| `title` | `set title: New Title` |',
        '',
        '**Note:** trailing whitespace in `set prompt:` is preserved.',
        '',
        '```',
        'set typing-speed: instant',
        '$ npm install   # runs instantly',
        'set typing-speed: normal',
        '```',
      ].join('\n'),
    ],
    [
      (l) => /^\[.+\]$/.test(l),
      [
        '### `[block-name]`  — Named block label',
        '',
        'Defines a named block. Everything from this label to the next `[label]`',
        'or end of file belongs to the block.',
        '',
        'Block labels are **ignored during normal compilation** — they are only',
        'meaningful when the file is included with `include: file#block-name`.',
        '',
        '```',
        '[login]',
        '$ ssh user@server.example.com',
        'hidden: my-password',
        '',
        '[verify]',
        '$ whoami',
        '> user',
        '```',
        '',
        'Then in another script:',
        '```',
        'include: shared/login.castscript#login',
        '```',
      ].join('\n'),
    ],

    // ── Config keys ────────────────────────────────────────────────────────
    [
      (l) => /^title\s*:/.test(l),
      [
        '### `title`  — Recording title',
        '',
        'The title shown in the asciinema player UI and stored in the cast header.',
        '',
        '```',
        'title:  My Demo Recording',
        '```',
      ].join('\n'),
    ],
    [
      (l) => /^width\s*:/.test(l),
      [
        '### `width`  — Terminal width',
        '',
        'Terminal width in columns. Default: **120**.',
        '',
        'This sets the `cols` field in the asciicast header.',
        'Common values: `80`, `100`, `120`, `200`.',
        '',
        '```',
        'width:  120',
        '```',
      ].join('\n'),
    ],
    [
      (l) => /^height\s*:/.test(l),
      [
        '### `height`  — Terminal height',
        '',
        'Terminal height in rows. Default: **30**.',
        '',
        'This sets the `rows` field in the asciicast header.',
        'Common values: `24`, `30`, `40`, `50`.',
        '',
        '```',
        'height: 30',
        '```',
      ].join('\n'),
    ],
    [
      (l) => /^shell\s*:/.test(l),
      [
        '### `shell`  — Shell name',
        '',
        'The shell name stored in the cast header. Default: **`bash`**.',
        'Informational only — does not affect compilation.',
        '',
        '```',
        'shell:  zsh',
        '```',
      ].join('\n'),
    ],
    [
      (l) => /^prompt\s*:/.test(l),
      [
        '### `prompt`  — Shell prompt',
        '',
        'The prompt string prepended before each `$` command. Default: **`$ `**.',
        '',
        '**Trailing whitespace is preserved** — include a trailing space if your',
        'prompt ends with one (as most do).',
        '',
        'Supports **inline style tags** for coloured prompts:',
        '```',
        'prompt: user@host:~/project$ ',
        'prompt: {green: user}@{bold: host}:~$ ',
        'prompt: ╰─○ ',
        '```',
        '',
        'Can be changed mid-script with `set prompt: new-prompt `.',
      ].join('\n'),
    ],
    [
      (l) => /^theme\s*:/.test(l),
      [
        '### `theme`  — Terminal theme',
        '',
        'Theme name stored in the cast header. Default: **`default`**.',
        'Informational only — the theme is applied by the asciinema player, not by cast-builder.',
        '',
        '```',
        'theme:  monokai',
        '```',
      ].join('\n'),
    ],
    [
      (l) => /^typing-speed\s*:/.test(l),
      [
        '### `typing-speed`  — Typing animation speed',
        '',
        'Controls how fast characters are typed in `$`, `type:`, and `hidden:`',
        'directives. Default: **`normal`**.',
        '',
        '| Value | Avg delay | Jitter |',
        '|-------|-----------|--------|',
        '| `instant` | 0 ms | none |',
        '| `fast` | ~30 ms | ±10 ms |',
        '| `normal` | ~80 ms | ±40 ms |',
        '| `slow` | ~150 ms | ±60 ms |',
        '| `Nms` | N ms | ±25% of N |',
        '',
        '```',
        'typing-speed: normal',
        'typing-speed: 60ms',
        '```',
        '',
        'Can be changed mid-script with `set typing-speed: fast`.',
      ].join('\n'),
    ],
    [
      (l) => /^typing-seed\s*:/.test(l),
      [
        '### `typing-seed`  — RNG seed',
        '',
        'Seed for the typing-jitter random number generator. Default: **random**.',
        '',
        'Set this to produce **fully deterministic, bit-identical output** across',
        'multiple compiles — useful for golden-file tests and CI pipelines.',
        '',
        '```',
        'typing-seed: 42',
        '```',
        '',
        'Without a seed, each compile produces slightly different timings.',
      ].join('\n'),
    ],
    [
      (l) => /^idle-time\s*:/.test(l),
      [
        '### `idle-time`  — Between-command pause',
        '',
        'Seconds of pause automatically inserted **before** every command after',
        'the first. Default: **`1.0`**.',
        '',
        'This simulates the human think-time between finishing one command and',
        'typing the next. Set to `0` to disable.',
        '',
        '```',
        'idle-time: 1.0',
        'idle-time: 0.5',
        '```',
        '',
        'Can be changed mid-script with `set idle-time: 0.5`.',
      ].join('\n'),
    ],
    [
      (l) => /^output-format\s*:/.test(l),
      [
        '### `output-format`  — Asciicast format version',
        '',
        'Controls the asciicast output format. Default: **`v3`**.',
        '',
        '| Value | Timestamps | Notes |',
        '|-------|------------|-------|',
        '| `v3` | Delta (since previous event) | Recommended |',
        '| `v2` | Absolute (since start) | Wider player support |',
        '',
        '```',
        'output-format: v3',
        '```',
      ].join('\n'),
    ],
    [
      (l) => /^env\s*:/.test(l),
      [
        '### `env`  — Environment variable',
        '',
        'An environment variable stored in the cast header (`KEY=VALUE` format).',
        'Repeat the line for multiple entries.',
        '',
        'Informational only — does not affect the recorded output.',
        '',
        '```',
        'env:  SHELL=/bin/zsh',
        'env:  TERM=xterm-256color',
        '```',
      ].join('\n'),
    ],
  ];

  monaco.languages.registerHoverProvider('castscript', {
    provideHover(model, position) {
      const line = model.getLineContent(position.lineNumber).trim();

      for (const [matcher, doc] of HOVER_DOCS) {
        if (matcher(line)) {
          return {
            contents: [{ value: doc, isTrusted: true, supportThemeIcons: true }],
          };
        }
      }

      return null;
    },
  });
}
