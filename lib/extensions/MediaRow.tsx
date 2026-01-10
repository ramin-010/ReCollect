import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MediaRowView } from '@/components/docs/MediaRowView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaRow: {
      /**
       * Insert a media row with initial items
       */
      insertMediaRow: (items?: Array<{ itemType: string; src?: string; url?: string; embedType?: string }>) => ReturnType;
    };
  }
}

export const MediaRow = Node.create({
  name: 'mediaRow',

  // Block-level node
  group: 'block',

  // Contains one or more mediaItems
  content: 'mediaItem+',

  // Can be selected as a whole
  selectable: true,

  // Allow dragging the entire row
  draggable: true,

  addAttributes() {
    return {
      // Gap between items (in pixels)
      gap: {
        default: 8,
        parseHTML: (el) => parseInt(el.getAttribute('data-gap') || '8'),
        renderHTML: (attrs) => ({ 'data-gap': attrs.gap }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-media-row]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-media-row': '' }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      insertMediaRow:
        (items = []) =>
        ({ commands }) => {
          // If no items provided, create with a placeholder
          const content = items.length > 0
            ? items.map((item) => ({
                type: 'mediaItem',
                attrs: item,
              }))
            : [{ type: 'mediaItem', attrs: { itemType: 'image', src: '' } }];

          return commands.insertContent({
            type: 'mediaRow',
            content,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaRowView);
  },
});
