import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AINodeView } from '@/components/docs/AINodeView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineAi: {
      /**
       * Insert an AI inline prompt node
       */
      setInlineAi: () => ReturnType;
    };
  }
}

export const InlineAINode = Node.create({
  name: 'inlineAi',

  group: 'block',

  atom: true, // Treat as a single unit (not editable inside)

  parseHTML() {
    return [
      {
        tag: 'div[data-ai-node]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-ai-node': '' }, HTMLAttributes)];
  },

  addCommands() {
    return {
      setInlineAi:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(AINodeView);
  },
});
