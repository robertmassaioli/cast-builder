/**
 * CodeMirror 6 — context-aware auto-complete for .castscript.
 *
 * - Inside --- config ---: suggests config keys
 * - Inside --- script ---: suggests directives
 * - After "typing-speed: ": suggests speed presets
 * - After "set ": suggests settable keys
 * - After "wait: ": suggests duration examples
 */
import { type CompletionContext, type Completion, autocompletion, completeFromList } from '@codemirror/autocomplete';

const SCRIPT_DIRECTIVES: Completion[] = [
  { label: '$ ',        type: 'keyword',  detail: 'type and run a command',          boost: 10 },
  { label: '> ',        type: 'keyword',  detail: 'output line (supports {style: tags})' },
  { label: '>> ',       type: 'keyword',  detail: 'embed file contents as output' },
  { label: 'type: ',    type: 'keyword',  detail: 'type text without pressing Enter' },
  { label: 'hidden: ',  type: 'keyword',  detail: 'type without echo (passwords)' },
  { label: 'print: ',   type: 'keyword',  detail: 'instantly print text' },
  { label: 'wait: ',    type: 'keyword',  detail: 'pause (e.g. 1s or 500ms)' },
  { label: 'clear',     type: 'keyword',  detail: 'clear the screen' },
  { label: 'marker: ',  type: 'keyword',  detail: 'insert a named chapter marker' },
  { label: 'resize: ',  type: 'keyword',  detail: 'change terminal size (e.g. 80x24)' },
  { label: 'set ',      type: 'keyword',  detail: 'override a config value mid-script' },
  { label: 'include: ', type: 'keyword',  detail: 'include another .castscript' },
  { label: 'raw: ',     type: 'keyword',  detail: 'emit raw ANSI escape sequence' },
];

const CONFIG_KEYS: Completion[] = [
  { label: 'title:         ', type: 'property', detail: 'recording title' },
  { label: 'width:         ', type: 'property', detail: 'terminal columns (default 120)' },
  { label: 'height:        ', type: 'property', detail: 'terminal rows (default 30)' },
  { label: 'shell:         ', type: 'property', detail: 'shell name (default bash)' },
  { label: 'prompt:        ', type: 'property', detail: 'prompt string (e.g. "$ ")' },
  { label: 'theme:         ', type: 'property', detail: 'colour theme name' },
  { label: 'typing-speed:  ', type: 'property', detail: 'slow | normal | fast | instant | Nms' },
  { label: 'typing-seed:   ', type: 'property', detail: 'RNG seed for deterministic timing' },
  { label: 'idle-time:     ', type: 'property', detail: 'seconds between command blocks (default 1.0)' },
  { label: 'output-format: ', type: 'property', detail: 'v2 or v3 (default v3)' },
  { label: 'env:           ', type: 'property', detail: 'KEY=VALUE environment variable' },
];

const TYPING_SPEEDS: Completion[] = [
  { label: 'instant', type: 'enum', detail: '0ms — no delay' },
  { label: 'fast',    type: 'enum', detail: '~30ms per character' },
  { label: 'normal',  type: 'enum', detail: '~80ms per character (default)' },
  { label: 'slow',    type: 'enum', detail: '~150ms per character' },
];

const SET_KEYS: Completion[] = [
  { label: 'set typing-speed: ', type: 'keyword', detail: 'change typing speed' },
  { label: 'set prompt: ',       type: 'keyword', detail: 'change prompt string' },
  { label: 'set idle-time: ',    type: 'keyword', detail: 'change idle gap between commands' },
];

const WAIT_EXAMPLES: Completion[] = [
  { label: '500ms', type: 'enum' },
  { label: '1s',    type: 'enum' },
  { label: '1.5s',  type: 'enum' },
  { label: '2s',    type: 'enum' },
  { label: '3s',    type: 'enum' },
];

/** Detect which section the cursor is in by scanning backwards. */
function detectSection(context: CompletionContext): 'config' | 'script' | 'none' {
  const doc = context.state.doc;
  const curLine = doc.lineAt(context.pos).number;
  for (let i = curLine; i >= 1; i--) {
    const text = doc.line(i).text;
    if (text === '--- script ---') return 'script';
    if (text === '--- config ---') return 'config';
  }
  return 'none';
}

function castscriptCompletions(context: CompletionContext) {
  const line = context.state.doc.lineAt(context.pos);
  const lineText = line.text;
  const beforeCursor = lineText.slice(0, context.pos - line.from);

  // After "typing-speed: " or "set typing-speed: " — suggest speed presets
  if (/typing-speed:\s*$/.test(beforeCursor)) {
    return completeFromList(TYPING_SPEEDS)(context);
  }

  // After "wait: " — suggest duration examples
  if (/^wait:\s*$/.test(beforeCursor)) {
    return { from: context.pos, options: WAIT_EXAMPLES };
  }

  // After "set " — suggest settable keys
  if (/^set\s+$/.test(beforeCursor)) {
    return { from: context.pos, options: SET_KEYS };
  }

  const word = context.matchBefore(/\S*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const section = detectSection(context);

  if (section === 'config') {
    return { from: word.from, options: CONFIG_KEYS };
  }

  if (section === 'script' || section === 'none') {
    return { from: word.from, options: SCRIPT_DIRECTIVES };
  }

  return null;
}

export const castscriptAutocomplete = autocompletion({
  override: [castscriptCompletions],
  activateOnTyping: false,
  defaultKeymap: true,
});
