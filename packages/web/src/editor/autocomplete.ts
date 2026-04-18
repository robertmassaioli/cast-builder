/**
 * CodeMirror 6 — auto-complete for .castscript directives and config keys.
 */
import { type CompletionContext, type Completion, autocompletion } from '@codemirror/autocomplete';

const SCRIPT_DIRECTIVES: Completion[] = [
  { label: '$ ',       type: 'keyword', detail: 'command — type and run',       boost: 10 },
  { label: '> ',       type: 'keyword', detail: 'output line' },
  { label: '>> ',      type: 'keyword', detail: 'file output' },
  { label: 'type: ',   type: 'keyword', detail: 'type without Enter' },
  { label: 'hidden: ', type: 'keyword', detail: 'type without echo (password)' },
  { label: 'print: ',  type: 'keyword', detail: 'instantly print text' },
  { label: 'wait: ',   type: 'keyword', detail: 'pause (e.g. 1s or 500ms)' },
  { label: 'clear',    type: 'keyword', detail: 'clear the screen' },
  { label: 'marker: ', type: 'keyword', detail: 'insert a chapter marker' },
  { label: 'resize: ', type: 'keyword', detail: 'change terminal size (e.g. 80x24)' },
  { label: 'set ',     type: 'keyword', detail: 'override config mid-script' },
  { label: 'include: ',type: 'keyword', detail: 'include another castscript' },
  { label: 'raw: ',    type: 'keyword', detail: 'emit raw ANSI sequence' },
];

const CONFIG_KEYS: Completion[] = [
  { label: 'title:        ', type: 'property', detail: 'recording title' },
  { label: 'width:        ', type: 'property', detail: 'terminal columns (default 120)' },
  { label: 'height:       ', type: 'property', detail: 'terminal rows (default 30)' },
  { label: 'shell:        ', type: 'property', detail: 'shell name (default bash)' },
  { label: 'prompt:       ', type: 'property', detail: 'prompt string (e.g. "$ ")' },
  { label: 'theme:        ', type: 'property', detail: 'colour theme name' },
  { label: 'typing-speed: ', type: 'property', detail: 'slow | normal | fast | instant | Nms' },
  { label: 'typing-seed:  ', type: 'property', detail: 'RNG seed for deterministic timing' },
  { label: 'idle-time:    ', type: 'property', detail: 'seconds between command blocks' },
  { label: 'output-format:', type: 'property', detail: 'v2 or v3 (default v3)' },
  { label: 'env:          ', type: 'property', detail: 'KEY=VALUE environment variable' },
];

const TYPING_SPEEDS: Completion[] = [
  { label: 'instant', type: 'enum' },
  { label: 'fast',    type: 'enum' },
  { label: 'normal',  type: 'enum' },
  { label: 'slow',    type: 'enum' },
];

function castscriptCompletions(context: CompletionContext) {
  const line = context.state.doc.lineAt(context.pos);
  const lineText = line.text;

  // After "typing-speed: " — suggest speed presets
  if (/typing-speed:\s*$/.test(lineText)) {
    return { from: context.pos, options: TYPING_SPEEDS };
  }

  // Inside config section — suggest config keys at start of line
  if (/^\s*$/.test(lineText) || context.explicit) {
    // Peek back to determine if we're in config or script section
    // Simple heuristic: suggest both and let CM filter
    const word = context.matchBefore(/\S*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: [...SCRIPT_DIRECTIVES, ...CONFIG_KEYS],
    };
  }

  return null;
}

export const castscriptAutocomplete = autocompletion({
  override: [castscriptCompletions],
  activateOnTyping: false,
});
