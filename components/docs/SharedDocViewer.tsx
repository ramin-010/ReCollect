'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import AutoJoiner from 'tiptap-extension-auto-joiner';
import { ResizableImage } from '@/lib/extensions/ResizableImage';
// Note: We don't import SlashCommands as this is read-only

interface SharedDocViewerProps {
  doc: {
    title: string;
    content: any;
    coverImage: string | null;
    updatedAt: string;
  };
}

export function SharedDocViewer({ doc }: SharedDocViewerProps) {
  const [mounted, setMounted] = useState(false);

  const editor = useEditor({
    editable: false, // READ ONLY MODE
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: true, // Allow clicking links in read-only mode
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
    ],
    content: doc.content, 
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] pro-prose', // Add prose classes if needed
      },
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (editor && doc.content) {
       // Should we parse content? 
       // The API returns whatever was stored. DocEditor stores JSON object (stringified in DB maybe? or Mixed).
       // DocSchema says "content: Schema.Types.Mixed". usually it's the JSON object directly.
       // But DocEditor `contentRef` stores stringified.
       // Let's assume the API returns the JSON object if it's Mixed type.
       // If it is stringified JSON, Tiptap might handle it or we need to parse.
       // DocEditor `getInitialContent` parses if string.
       // Let's safe handle it.
       let content = doc.content;
       if (typeof content === 'string') {
         try {
           content = JSON.parse(content);
         } catch (e) {
           // treat as HTML string or plain text
         }
       }
       editor.commands.setContent(content);
    }
  }, [editor, doc.content]);


  if (!mounted || !editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-[hsl(var(--muted-foreground))]">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center">
        
        {/* Cover Image */}
        {doc.coverImage ? (
          <div className="w-full h-64 md:h-80 relative mb-8">
            <img 
              src={doc.coverImage} 
              alt="Cover" 
              className="w-full h-full object-cover object-[0_50%]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[hsl(var(--background))]" />
          </div>
        ) : (
           <div className="h-24" /> // Spacer
        )}

        <div className={`w-full max-w-7xl px-8 ${doc.coverImage ? '-mt-20 relative z-10' : ''}`}>
             
            {/* Title */}
            <div className="mb-10 pl-4">
              <h1 
                className="text-[48px] md:text-[62px] font-bold text-[hsl(var(--foreground))] leading-tight mb-4"
                style={{ fontFamily: '"Noto Sans", "Roboto", sans-serif' }}
              >
                {doc.title || 'Untitled'}
              </h1>
              <div className="w-16 h-1 bg-amber-500 rounded-full" />
              <div className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
                Last updated {new Date(doc.updatedAt).toLocaleDateString()}
              </div>
            </div>

            {/* Content */}
            <div className="prose dark:prose-invert max-w-none pb-20">
               <EditorContent editor={editor} />
            </div>
        </div>
    </div>
  );
}
