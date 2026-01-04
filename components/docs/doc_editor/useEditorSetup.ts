'use client';

import { useCallback } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import AutoJoiner from 'tiptap-extension-auto-joiner';
import { SlashCommands } from '../SlashCommands';
import { ResizableImage } from '@/lib/extensions/ResizableImage';
import { Doc } from '@/lib/store/docStore';

interface UseEditorSetupOptions {
  doc: Doc;
  onContentChange: (jsonString: string) => void;
}

export function useEditorSetup({ doc, onContentChange }: UseEditorSetupOptions) {
  const getInitialContent = useCallback(() => {
    try {
      const parsed = JSON.parse(doc.content);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      return '';
    } catch {
      return doc.content || '';
    }
  }, [doc.content]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading';
          }
          return "Type '/' for commands...";
        },
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
        includeChildren: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline cursor-pointer hover:text-blue-300',
        },
      }),
      ResizableImage,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      TextStyle,
      Color,
      AutoJoiner.configure({
        elementsToJoin: ['bulletList', 'orderedList'],
      }),
      SlashCommands,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      onContentChange(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[900px]',
      },
      handlePaste: (view, event, slice) => {
        const item = event.clipboardData?.items[0];
        if (item?.type.indexOf('image') === 0) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: e.target?.result });
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.indexOf('image') === 0) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const node = schema.nodes.image.create({ src: e.target?.result });
              const transaction = view.state.tr.insert(coordinates?.pos || 0, node);
              view.dispatch(transaction);
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  return { editor, getInitialContent };
}
