import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { X, Maximize2 } from 'lucide-react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    taskImage: {
      insertTaskImage: (options: { src: string }) => ReturnType;
    };
  }
}

const TaskImageComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, deleteNode }) => {
  const handleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // In TiptapTaskEditor, we pass onImageClick via editorProps or injected context.
    // However, NodeViews don't easily access React props from the Editor component.
    // Instead, we can emit a custom DOM event that TiptapTaskEditor listens for.
    const event = new CustomEvent('task-image-expand', { detail: { src: node.attrs.src } });
    window.dispatchEvent(event);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNode();
  };

  return (
    <NodeViewWrapper as="div" className="img-container relative block w-fit my-2 mr-6 group" contentEditable={false}>
      <img
        src={node.attrs.src}
        alt="Task attachment"
        className={`max-w-[280px] max-h-[196px] rounded-md border border-white/10 block cursor-default ${
          selected ? 'ring-2 ring-indigo-500/50' : ''
        }`}
      />
      <div className="img-overlay absolute top-0 right-0 p-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleExpand}
          className="img-expand-btn w-[26px] h-[26px] rounded-md bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border-none cursor-pointer transition-colors"
          title="Expand image"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="img-delete-btn w-5 h-5 rounded-md bg-red-600/80 hover:bg-red-700 text-white flex items-center justify-center border-none cursor-pointer transition-colors"
          title="Delete image"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </div>
    </NodeViewWrapper>
  );
};

export const TaskImageExtension = Node.create({
  name: 'taskImage',
  group: 'block',
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.img-container',
        getAttrs: (dom) => {
          const img = (dom as HTMLElement).querySelector('img');
          return {
            src: img ? img.getAttribute('src') : null,
          };
        },
      },
      // Also catch normal images pasted from Word/etc if they don't have our wrapper
      {
        tag: 'img[src]',
        getAttrs: (dom) => {
          return {
            src: (dom as HTMLElement).getAttribute('src'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        class: 'max-w-[280px] max-h-[196px] rounded-md border border-white/10 block cursor-default',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskImageComponent);
  },

  addCommands() {
    return {
      insertTaskImage:
        (options: { src: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
