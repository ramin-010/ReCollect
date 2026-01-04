'use client';

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
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { SlashCommands } from '../SlashCommands';
import { ResizableImage } from '@/lib/extensions/ResizableImage';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { uploadToCloud } from '@/lib/utils/upload';
import { toast } from 'sonner';

// ============================================
// COLLABORATIVE EDITOR SETUP
// ============================================

interface UseCollaborativeEditorOptions {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  user: {
    name: string;
    color: string;
  };
}

export function useCollaborativeEditor({ 
  ydoc, 
  provider, 
  user 
}: UseCollaborativeEditorOptions) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit provides essential features (bold, italic, lists, etc.)
      // History is excluded because Yjs handles undo/redo
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        history: false,
      } as any) as any,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Heading';
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
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TextStyle,
      Color,
      AutoJoiner.configure({ elementsToJoin: ['bulletList', 'orderedList'] }),
      SlashCommands,
      // Collaboration extensions for real-time sync
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: user.name,
          color: user.color,
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[900px]',
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const image = items.find(item => item.type.startsWith('image'));
        
        if (image) {
          event.preventDefault();
          const file = image.getAsFile();
          if (file) {
             const pos = view.state.selection.from;
             
             toast.promise(uploadToCloud(file), {
                loading: 'Uploading image...',
                success: (url) => {
                   if (url) {
                      // Use ProseMirror transaction directly to avoid 'editor' closure issues
                      // 'editor' is undefined when editorProps is defined
                      const schema = view.state.schema;
                      // Determine node type (usually 'image' or 'resizableImage')
                      const imageType = schema.nodes.resizableImage || schema.nodes.image;
                      
                      if (imageType) {
                         const node = imageType.create({ src: url });
                         const tr = view.state.tr.insert(pos, node);
                         view.dispatch(tr);
                         console.log('Inserted image at', pos,"rurl", url);
                      } else {
                         console.error('Image node type not found in schema');
                      }
                   }
                   return 'Image uploaded';
                },
                error: 'Upload failed'
             });
          }
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        const hasFiles = event.dataTransfer?.files?.length || 0;
        if (hasFiles > 0) {
           const images = Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith('image'));
           if (images.length > 0) {
              event.preventDefault();
              images.forEach(file => {
                 const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                 const dropPos = coordinates?.pos ?? view.state.selection.from;

                 toast.promise(uploadToCloud(file), {
                    loading: 'Uploading image...',
                    success: (url) => {
                       if (url) {
                          const schema = view.state.schema;
                          const imageType = schema.nodes.resizableImage || schema.nodes.image;
                          
                          if (imageType) {
                             const node = imageType.create({ src: url });
                             const tr = view.state.tr.insert(dropPos, node);
                             view.dispatch(tr);
                          }
                       }
                       return 'Image uploaded';
                    },
                    error: 'Upload failed'
                 });
              });
              return true;
           }
        }
        return false;
      }
    },
  }, [ydoc, provider]);

  return { editor };
}
