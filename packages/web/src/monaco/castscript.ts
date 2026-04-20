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
    // tokenPostfix: '' prevents Monaco appending '.castscript' to token names.
    tokenPostfix: '',
    // defaultToken emitted when no rule matches — use cstext (plain colour)
    defaultToken: 'cstext',
    tokenizer: {
      root: [
        // Single-token whole-line rules — no sub-state needed
        [/^--- (config|script) ---$/, 'cssection'],
        [/^\s*#.*$/,                  'cscomment'],
        [/^\[.+\]$/,                  'csblock'],
        [/^>>\s+.*$/,                 'csfile'],
        [/^clear$/,                   'cskw'],

        // Config keys: match "key:" as two tokens (key + colon)
        [/^(title|width|height|prompt|typing-speed|idle-time|theme|output-format|typing-seed)(\s*:)(\s*.*)?$/,
          ['cskey', 'csdelim', 'cstext']],

        // wait/idle: duration value on same line
        [/^(wait|idle)(\s*:\s*)(\d+(?:\.\d+)?s|\d+ms)?(.*)$/,
          ['cswait', 'csdelim', 'csnum', 'cstext']],

        // marker/resize: rest is plain text
        [/^(marker|resize)(\s*:\s*)(.*)$/,
          ['csmarker', 'csdelim', 'cstext']],

        // include:
        [/^(include)(\s*:\s*)(.*)$/,
          ['csinclude', 'csdelim', 'cstext']],

        // type:/hidden:/raw: rest is plain text
        [/^(type|raw)(\s*:\s*)(.*)$/,  ['cskw', 'csdelim', 'cstext']],
        [/^(hidden)(\s*:\s*)(.*)$/,    ['csdim', 'csdelim', 'cstext']],

        // set key: value
        [/^(set\s+)([\w-]+)(\s*:\s*)(.*)$/,
          ['cskw', 'cskey', 'csdelim', 'cstext']],

        // print: — may contain style tags, needs sub-state
        [/^print:\s*/, { token: 'csprint', next: '@styledLine' }],

        // $ command — may contain style tags
        [/^\$\s+/, { token: 'cscmd', next: '@commandLine' }],

        // > output — may contain style tags (most common)
        [/^>\s?/, { token: 'csout', next: '@styledLine' }],

        // fallback
        [/.+/, 'cstext'],
      ],

      // Sub-states — only used for lines that need style-tag tokenization.
      // We use @rematch to pop cleanly without emitting an empty token.
      commandLine: [
        [/\{(?:[a-z#][^:}]*):/,  { token: 'cstag', next: '@commandStyled' }],
        [/\}/,                    'cstag'],
        [/[^{}\r\n]+/,            'cscmd'],
        [/$/, { token: '@rematch', next: '@pop' }],
      ],

      commandStyled: [
        [/\{(?:[a-z#][^:}]*):/,  { token: 'cstag', next: '@commandStyled' }],
        [/\}/,                   { token: 'cstag', next: '@pop' }],
        [/[^{}\r\n]+/,            'cscmd'],
        [/$/, { token: '@rematch', next: '@pop' }],
      ],

      styledLine: [
        [/\{(?:[a-z#][^:}]*):/,  { token: 'cstag', next: '@styleTagContent' }],
        [/\}/,                    'cstag'],
        [/[^{}\r\n]+/,            'csout'],
        [/$/, { token: '@rematch', next: '@pop' }],
      ],

      styleTagContent: [
        [/\{(?:[a-z#][^:}]*):/,  { token: 'cstag', next: '@styleTagContent' }],
        [/\}/,                   { token: 'cstag', next: '@pop' }],
        [/[^{}\r\n]+/,            'csout'],
        [/$/, { token: '@rematch', next: '@pop' }],
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
  monaco.languages.registerHoverProvider('castscript', {
    provideHover(model, position) {
      const line = model.getLineContent(position.lineNumber).trim();
      const docs: Record<string, string> = {
        '$ ':         '**Command** — types and "runs" a shell command with animated keystrokes',
        '> ':         '**Output** — a line of terminal output (supports `{style: text}` tags)',
        '>> ':        '**File output** — inlines the contents of a file as output lines',
        'print: ':    '**Print** — instantly prints text (no typing animation)',
        'type: ':     '**Type** — types text without pressing Enter',
        'hidden: ':   '**Hidden** — types text that does not echo (password simulation)',
        'wait: ':     '**Wait** — inserts an explicit pause (e.g. `1s`, `500ms`)',
        'clear':      '**Clear** — clears the terminal screen',
        'marker: ':   '**Marker** — inserts a named chapter marker (seekable in the player)',
        'resize: ':   '**Resize** — changes terminal dimensions mid-script (e.g. `80x24`)',
        'raw: ':      '**Raw** — emits a raw ANSI escape sequence verbatim',
        'include: ':  '**Include** — inlines another `.castscript` file (optionally a named block)',
        'set ':       '**Set** — overrides a config key mid-script (prompt, typing-speed, idle-time)',
      };
      for (const [prefix, doc] of Object.entries(docs)) {
        if (line.startsWith(prefix) || line === prefix.trim()) {
          return { contents: [{ value: doc }] };
        }
      }
      return null;
    },
  });
}
