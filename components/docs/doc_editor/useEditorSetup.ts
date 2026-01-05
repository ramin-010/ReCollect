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
import { toast } from 'sonner';
import { yjsStateToJson } from '@/lib/utils/yjsConverter';
import { imageStorage } from '@/lib/storage/imageStorage';

interface UseEditorSetupOptions {
  doc: Doc;
  onContentChange: (jsonString: string) => void;
}

// Generate unique image ID
function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useEditorSetup({ doc, onContentChange }: UseEditorSetupOptions) {
  const getInitialContent = useCallback(() => {
    // Prioritize yjsState for unified storage (collab compatibility)
    if (doc.yjsState) {
      try {
        return yjsStateToJson(doc.yjsState);
      } catch (err) {
        console.error('[Editor] Failed to load yjsState:', err);
      }
    }
    
    // No yjsState available - return empty document
    return { type: 'doc', content: [] };
  }, [doc.yjsState]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }) as any,
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
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const image = items.find(item => item.type.startsWith('image'));
        
        if (image) {
          event.preventDefault();
          const file = image.getAsFile();
          if (file) {
            const { $from } = view.state.selection;
            const currentNode = $from.parent;
            
            const imageId = generateImageId();
            
            (async () => {
              try {
                await imageStorage.storeImage(imageId, file);
                
                const blobUrl = imageStorage.createObjectURL(file);
                
                const schema = view.state.schema;
                const imageType = schema.nodes.resizableImage || schema.nodes.image;
                
                if (imageType) {
                  const node = imageType.create({ 
                    src: blobUrl,
                    imageId: imageId,
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
                  toast.success('Image added');
                }
              } catch (err) {
                console.error('[Editor] Failed to store image:', err);
                toast.error('Failed to add image');
              }
            })();
            
            return true;
          }
        }
        return false;
      },
      // Local storage on drop - upload happens on save
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const images = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image'));
          
          if (images.length > 0) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            const dropPos = coordinates?.pos ?? view.state.selection.from;
            
            images.forEach(file => {
              const imageId = generateImageId();
              
              (async () => {
                try {
                  // Store blob in IndexedDB
                  await imageStorage.storeImage(imageId, file);
                  
                  // Create blob URL for immediate display
                  const blobUrl = imageStorage.createObjectURL(file);
                  
                  const schema = view.state.schema;
                  const imageType = schema.nodes.resizableImage || schema.nodes.image;
                  
                  if (imageType) {
                    const node = imageType.create({ 
                      src: blobUrl,
                      imageId: imageId,
                    });
                    const tr = view.state.tr.replaceWith(dropPos, dropPos, node);
                    view.dispatch(tr);
                    toast.success('Image added');
                  }
                } catch (err) {
                  console.error('[Editor] Failed to store image:', err);
                  toast.error('Failed to add image');
                }
              })();
            });
            
            return true;
          }
        }
        return false;
      },
    },
  });

  return { editor, getInitialContent };
}


