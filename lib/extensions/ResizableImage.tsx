import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImageComponent } from '@/components/docs/ResizableImageComponent';

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: (attributes) => {
          return {
            width: attributes.width,
          };
        },
      },
      height: {
        default: 'auto',
        renderHTML: (attributes) => {
          return {
            height: attributes.height,
          };
        },
      },
      // Track pending uploads (personal docs) - imageId links to IndexedDB blob
      imageId: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.imageId) return {};
          return {
            'data-image-id': attributes.imageId,
          };
        },
        parseHTML: (element) => element.getAttribute('data-image-id'),
      },
      // Track cloud images (collab docs) - for cleanup
      cloudPublicId: {
        default: null,
      },
      cloudProvider: {
        default: null,
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
