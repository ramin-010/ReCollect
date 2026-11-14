import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ySyncPluginKey } from '@tiptap/y-tiptap';

/**
 * Refuses any local change that would leave the doc invalid for its schema (ProseMirror's own
 * check()). Yjs would store such a doc and every later edit could throw "Called contentMatchAt on
 * a node with invalid content", which is how side-by-side columns corrupted docs.
 *
 * - Remote changes (the Yjs sync plugin's transactions) pass: refusing them would split this editor
 *   from the shared doc. The server repairs and checks what it stores (backend docRepair.ts).
 * - A doc that is already invalid stays editable: only a change that breaks a valid doc is refused.
 */
const key = new PluginKey('docGuard');

function problemOf(doc: PMNode): string | null {
  try {
    doc.check();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export const DocGuard = Extension.create({
  name: 'docGuard',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        filterTransaction: (tr, state) => {
          if (!tr.docChanged || tr.getMeta(ySyncPluginKey) !== undefined) return true;
          const problem = problemOf(tr.doc);
          if (!problem || problemOf(state.doc)) return true;
          console.warn(`[DocGuard] A change was refused: it would leave the doc invalid (${problem.slice(0, 200)}).`);
          return false;
        },
      }),
    ];
  },
});
