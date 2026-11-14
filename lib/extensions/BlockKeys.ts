import { Extension } from '@tiptap/core';

/**
 * Keys that behave as in Notion where ProseMirror's defaults surprise:
 * - Backspace at the very start of a callout or quote turns that line back into text (the wrapper
 *   lets go of it) instead of gluing it onto the end of the block above.
 * - Tab and Shift-Tab outside lists and code do nothing, instead of moving the keyboard out of
 *   the editor (lists indent and code inserts spaces, as before: their handlers run first).
 */
export const BlockKeys = Extension.create({
  name: 'blockKeys',
  priority: 1000,

  addKeyboardShortcuts() {
    const keepTab = () => {
      const { editor } = this;
      if (editor.isActive('listItem') || editor.isActive('taskItem') || editor.isActive('codeBlock')) return false;
      return true;
    };
    return {
      Backspace: () => {
        const { editor } = this;
        const { selection } = editor.state;
        if (!selection.empty) return false;
        const { $from } = selection;
        if (!$from.parent.isTextblock || $from.parentOffset !== 0) return false;
        for (let d = $from.depth - 1; d > 0; d -= 1) {
          if ($from.index(d) !== 0) return false;
          const name = $from.node(d).type.name;
          if (name === 'callout' || name === 'blockquote') return editor.commands.lift(name);
        }
        return false;
      },
      Tab: keepTab,
      'Shift-Tab': keepTab,
    };
  },
});
