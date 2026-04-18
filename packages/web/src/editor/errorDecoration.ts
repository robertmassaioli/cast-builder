/**
 * CodeMirror 6 — error line decoration.
 * Adds a red background highlight to the line containing a parse/compile error.
 */
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';

export const setErrorLine = StateEffect.define<number | null>();

const errorLineDecoration = Decoration.line({ class: 'cm-error-line' });

export const errorLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setErrorLine)) {
        const lineNum = effect.value;
        if (lineNum === null) {
          deco = Decoration.none;
        } else {
          try {
            const line = tr.state.doc.line(lineNum);
            deco = Decoration.set([errorLineDecoration.range(line.from)]);
          } catch {
            deco = Decoration.none;
          }
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});
