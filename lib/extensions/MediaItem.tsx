import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MediaItemView } from '@/components/docs/MediaItemView';

export type MediaItemType = 'image' | 'embed' | 'link';

export interface MediaItemAttrs {
  itemType: MediaItemType;
  src?: string;       // For images
  url?: string;       // For embeds and links
  embedType?: 'youtube' | 'twitter' | 'link';
  width?: string;
  imageId?: string;   // For local images pending upload
}

export const MediaItem = Node.create({
  name: 'mediaItem',

  // This node belongs to a special group that MediaRow accepts
  group: 'mediaItem',

  // Treat as atomic unit - not editable inside
  atom: true,

  // Can be selected
  selectable: true,

  // Can be dragged (within the row)
  draggable: true,

  addAttributes() {
    return {
      itemType: {
        default: 'image' as MediaItemType,
        parseHTML: (el) => el.getAttribute('data-item-type') as MediaItemType,
        renderHTML: (attrs) => ({ 'data-item-type': attrs.itemType }),
      },
      src: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-src'),
        renderHTML: (attrs) => attrs.src ? { 'data-src': attrs.src } : {},
      },
      url: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-url'),
        renderHTML: (attrs) => attrs.url ? { 'data-url': attrs.url } : {},
      },
      embedType: {
        default: 'link',
        parseHTML: (el) => el.getAttribute('data-embed-type'),
        renderHTML: (attrs) => attrs.embedType ? { 'data-embed-type': attrs.embedType } : {},
      },
      width: {
        default: 'auto',
        parseHTML: (el) => el.getAttribute('data-width') || 'auto',
        renderHTML: (attrs) => ({ 'data-width': attrs.width }),
      },
      imageId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-image-id'),
        renderHTML: (attrs) => attrs.imageId ? { 'data-image-id': attrs.imageId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-media-item]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-media-item': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaItemView);
  },
});
