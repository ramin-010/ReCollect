import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { EmbedNodeView } from '@/components/docs/EmbedNodeView';
import { EmbedType } from '@/lib/utils/embedUtils';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      /**
       * Insert an embed node
       */
      setEmbed: (options: { url: string; embedType: EmbedType }) => ReturnType;
    };
  }
}

export const EmbedNode = Node.create({
  name: 'embed',

  group: 'block',

  atom: true, // Treat as a single unit (not editable inside)

  addAttributes() {
    return {
      url: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-url'),
        renderHTML: (attributes) => ({
          'data-url': attributes.url,
        }),
      },
      embedType: {
        default: 'link' as EmbedType,
        parseHTML: (element) => element.getAttribute('data-embed-type') as EmbedType,
        renderHTML: (attributes) => ({
          'data-embed-type': attributes.embedType,
        }),
      },
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('data-width') || '100%',
        renderHTML: (attributes) => ({
          'data-width': attributes.width,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-embed]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-embed': '' }, HTMLAttributes)];
  },

  addCommands() {
    return {
      setEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedNodeView);
  },
});
