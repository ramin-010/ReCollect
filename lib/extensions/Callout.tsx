import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CalloutView } from '@/components/docs/editor/CalloutView';

/** GitHub's alert kinds, so a callout round-trips through Markdown as `> [!TIP]`. */
export const CALLOUT_KINDS = ['note', 'tip', 'important', 'warning', 'caution'] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

const isKind = (v: unknown): v is CalloutKind => typeof v === 'string' && (CALLOUT_KINDS as readonly string[]).includes(v);

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /** Wraps the selected blocks in a callout. */
      setCallout: (attrs?: { kind?: CalloutKind }) => ReturnType;
      /** Lifts the content out of the callout. */
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * A callout: a tinted box with an icon that holds any blocks. The backend's Markdown service
 * defines the same node (name, `kind`, `div[data-callout]`), so keep the two in step.
 */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: 'note',
        parseHTML: (el) => {
          const v = el.getAttribute('data-callout');
          return isKind(v) ? v : 'note';
        },
        renderHTML: (attrs) => ({ 'data-callout': isKind(attrs.kind) ? attrs.kind : 'note' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'doc-callout' }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { kind: attrs?.kind ?? 'note' }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});
