'use client';

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface TaskHighlightOptions {
  onMentionDelete?: (name: string) => void;
  onLabelDelete?: (name: string) => void;
}

function findMatches(doc: ProseMirrorNode) {
  const decorations: Decoration[] = [];
  const tagRegex = /(?:^|\s)(#[a-zA-Z0-9_]+)/g;
  const mentionRegex = /(?:^|\s)(@[a-zA-Z0-9_\.]+)/g;

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const text = node.text;
    let match;

    // Tags
    tagRegex.lastIndex = 0;
    while ((match = tagRegex.exec(text)) !== null) {
      const start = pos + match.index + (match[0].length - match[1].length);
      const end = start + match[1].length;
      decorations.push(
        Decoration.inline(start, end, {
          class: 'bg-blue-500/20 text-blue-300 rounded-sm px-0.5',
        })
      );
    }

    // Mentions
    mentionRegex.lastIndex = 0;
    while ((match = mentionRegex.exec(text)) !== null) {
      const start = pos + match.index + (match[0].length - match[1].length);
      const end = start + match[1].length;
      decorations.push(
        Decoration.inline(start, end, {
          class: 'bg-indigo-500/20 text-indigo-300 rounded-sm px-0.5',
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const createTaskHighlightExtension = (options: TaskHighlightOptions = {}) => Extension.create({
  name: 'taskHighlight',

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { empty, $from } = selection;

        if (!empty) return false;

        // ── Exact same approach as title input ──
        // title uses: `const textBeforeCursor = title.slice(0, cursorPos);`
        // we use:     `blockText.slice(0, offset)` — identical concept
        const blockText = $from.parent.textContent;
        const offset = $from.parentOffset;
        const textBeforeCursor = blockText.slice(0, offset);

        // ── Check for confirmed label: #word followed by a LITERAL space ──
        // Title logic: match /#(\w+)\s?$/, then check `isConfirmedLabel`.
        // In the editor, the trailing space IS the confirmation signal
        // (the dropdown always inserts "#tagname " with a space).
        // So here we REQUIRE the space (not optional) — if there's no space,
        // the user is still typing, so backspace should work normally.
        const labelMatch = textBeforeCursor.match(/#(\w+) $/);
        if (labelMatch) {
          const fullMatch = labelMatch[0];
          const name = labelMatch[1];
          const blockStart = $from.start();
          const fromPos = blockStart + (offset - fullMatch.length);
          const toPos = blockStart + offset;

          if (options.onLabelDelete) {
            options.onLabelDelete(name);
          }

          editor.chain().focus().deleteRange({ from: fromPos, to: toPos }).run();
          return true;
        }

        // ── Check for confirmed mention: @word followed by a LITERAL space ──
        const mentionMatch = textBeforeCursor.match(/@(\w+) $/);
        if (mentionMatch) {
          const fullMatch = mentionMatch[0];
          const name = mentionMatch[1];
          const blockStart = $from.start();
          const fromPos = blockStart + (offset - fullMatch.length);
          const toPos = blockStart + offset;

          if (options.onMentionDelete) {
            options.onMentionDelete(name);
          }

          editor.chain().focus().deleteRange({ from: fromPos, to: toPos }).run();
          return true;
        }

        // No confirmed tag/mention — let normal backspace happen (char by char)
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('taskHighlight'),
        state: {
          init(_, { doc }) { return findMatches(doc); },
          apply(tr, old) {
            if (!tr.docChanged) return old.map(tr.mapping, tr.doc);
            return findMatches(tr.doc);
          },
        },
        props: {
          decorations(state) { return this.getState(state); },
        },
      }),
    ];
  },
});
