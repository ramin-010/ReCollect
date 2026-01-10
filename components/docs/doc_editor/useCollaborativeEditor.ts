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
import { EmbedNode } from '@/lib/extensions/EmbedNode';
import { MediaRow } from '@/lib/extensions/MediaRow';
import { MediaItem } from '@/lib/extensions/MediaItem';
import { isEmbeddableUrl, getEmbedType } from '@/lib/utils/embedUtils';
import { ResizableImage } from '@/lib/extensions/ResizableImage';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { uploadToCloud } from '@/lib/utils/upload';
import { toast } from 'sonner';

function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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
  docId: string;
}

export function useCollaborativeEditor({ 
  ydoc, 
  provider, 
  user,
  docId,
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
      EmbedNode,
      MediaRow,
      MediaItem,
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
        class: 'focus:outline-none min-h-[1000px]',
      },
      handlePaste: (view, event) => {
        // Check for embeddable URL first
        const text = event.clipboardData?.getData('text/plain')?.trim();
        if (text && isEmbeddableUrl(text)) {
          event.preventDefault();
          const embedType = getEmbedType(text);
          const { state } = view;
          const { from, to } = state.selection;
          const node = state.schema.nodes.embed?.create({ url: text, embedType });
          if (node) {
            const tr = state.tr.replaceRangeWith(from, to, node);
            view.dispatch(tr);
            return true;
          }
        }

        const items = Array.from(event.clipboardData?.items || []);
        const image = items.find(item => item.type.startsWith('image'));
        
        if (image) {
          event.preventDefault();
          const file = image.getAsFile();
          if (file) {
             const { $from } = view.state.selection;
             const currentNode = $from.parent;
             const imageId = generateImageId();
             
             toast.promise(uploadToCloud(file, docId, imageId), {
                loading: 'Uploading image...',
                success: (result) => {
                   if (result?.url) {
                      const schema = view.state.schema;
                      const imageType = schema.nodes.resizableImage || schema.nodes.image;
                      
                      if (imageType) {
                         const node = imageType.create({ 
                           src: result.url,
                           imageId: result.imageId,
                         });
                         let tr = view.state.tr;
                         
                         if (currentNode.type.name === 'paragraph' && currentNode.content.size === 0) {
                            const start = $from.before($from.depth);
                            const end = $from.after($from.depth);
                            tr = tr.replaceWith(start, end, node);
                         } else {
                            tr = tr.insert($from.pos, node);
                         }
                         view.dispatch(tr);
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
                 const imageId = generateImageId();

                 toast.promise(uploadToCloud(file, docId, imageId), {
                    loading: 'Uploading image...',
                    success: (result) => {
                       if (result?.url) {
                          const schema = view.state.schema;
                          const imageType = schema.nodes.resizableImage || schema.nodes.image;
                          
                          if (imageType) {
                             const node = imageType.create({ 
                               src: result.url,
                               imageId: result.imageId,
                             });
                             const tr = view.state.tr.replaceWith(dropPos, dropPos, node);
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
