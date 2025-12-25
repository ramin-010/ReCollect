'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, CheckSquare, Highlighter, Link as LinkIcon, Trash2, Code } from 'lucide-react';
import { SlashCommands } from './SlashCommands';
import { debounce } from 'lodash';

interface BlockEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function BlockEditor({
  content,
  onChange,
  onFocus,
  onBlur,
  readOnly = false,
  autoFocus = false,
  onKeyDown
}: BlockEditorProps) {
  
  const [showBubbleMenu, setShowBubbleMenu] = useState(false);
  const [bubbleMenuPos, setBubbleMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Debounced handler needs to be defined BEFORE useEditor so it can be used inside onUpdate
  const debouncedOnChange = useMemo(
    () => debounce((html: string) => {
      onChange(html);
    }, 500), 
    [onChange]
  );
  
  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }, // Limit headings in notes
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands...",
        includeChildren: true,
        showOnlyCurrent: true, 
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer hover:text-blue-600',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      SlashCommands,
    ],
    content: content,
    editable: !readOnly,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none max-w-none leading-normal text-[hsl(var(--foreground))]',
      },
      handleKeyDown: (view, event) => {
        if (onKeyDown) {
            // @ts-ignore
            onKeyDown(event);
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      debouncedOnChange(editor.getHTML());
    },
    onFocus: () => onFocus?.(),
    onBlur: () => {
      // Flush any pending debounced save immediately on blur
      // This ensures pasted content is saved when user clicks outside
      debouncedOnChange.flush();
      onBlur?.();
    },
  });

  // Sync content if it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
       if (!editor.isFocused) {
           editor.commands.setContent(content);
       }
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor && editor.isEditable !== !readOnly) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  // Handle Bubble Menu Positioning
  useEffect(() => {
    if (!editor) return;

    const updateMenu = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      
      if (hasSelection && !readOnly) {
        // Calculate position
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        
        // Position relative to viewport/fixed
        
        const centerLeft = (start.left + end.left) / 2;
        const topPos = start.top - 40; // 40px above
        
        setBubbleMenuPos({ top: topPos, left: centerLeft });
        setShowBubbleMenu(true);
      } else {
        setShowBubbleMenu(false);
      }
    };

    editor.on('selectionUpdate', updateMenu);
    editor.on('blur', ({ event }) => {
        // Allow time for clicks in the menu
        setTimeout(() => {
             // Logic to hide if not focused handled by selection change usually, but extra safety
        }, 100);
    });

    return () => {
      editor.off('selectionUpdate', updateMenu);
    };
  }, [editor, readOnly]);


  if (!editor) {
    return null;
  }

  return (
    <div className="relative w-full h-full">
      {showBubbleMenu && createPortal(
        <div 
            ref={menuRef}
            className="fixed z-[9999] flex items-center gap-1 p-1 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100"
            style={{ 
                top: bubbleMenuPos.top, 
                left: bubbleMenuPos.left,
                transform: 'translateX(-50%)' 
            }}
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation(); // prevent focus loss
            }} 
        >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-[hsl(var(--muted))] ${editor.isActive('bold') ? 'text-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/10' : 'text-[hsl(var(--muted-foreground))]'}`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-[hsl(var(--muted))] ${editor.isActive('italic') ? 'text-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/10' : 'text-[hsl(var(--muted-foreground))]'}`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded hover:bg-[hsl(var(--muted))] ${editor.isActive('underline') ? 'text-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/10' : 'text-[hsl(var(--muted-foreground))]'}`}
              title="Underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-[hsl(var(--border))] mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded hover:bg-[hsl(var(--muted))] ${editor.isActive('heading', { level: 2 }) ? 'text-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/10' : 'text-[hsl(var(--muted-foreground))]'}`}
              title="Heading 1"
            >
              <span className="font-bold text-xs">H1</span>
            </button>
             <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded hover:bg-[hsl(var(--muted))] ${editor.isActive('heading', { level: 3 }) ? 'text-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/10' : 'text-[hsl(var(--muted-foreground))]'}`}
              title="Heading 2"
            >
               <span className="font-bold text-xs">H2</span>
            </button>
            <div className="w-[1px] h-4 bg-[hsl(var(--border))] mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
              className={`p-1.5 rounded hover:bg-[hsl(var(--muted))] ${editor.isActive('highlight') ? 'text-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/10' : 'text-[hsl(var(--muted-foreground))]'}`}
              title="Highlight"
            >
              <Highlighter className="w-4 h-4" />
            </button>
             <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-[hsl(var(--muted))] ${editor.isActive('codeBlock') ? 'text-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/10' : 'text-[hsl(var(--muted-foreground))]'}`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>,
        document.body
      )}
      
      <EditorContent editor={editor} className="min-h-[24px] " />
    </div>
  );
}
