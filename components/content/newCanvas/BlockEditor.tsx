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
  onDelete?: () => void;
}

export function BlockEditor({
  content,
  onChange,
  onFocus,
  onBlur,
  readOnly = false,
  autoFocus = false,
  onKeyDown,
  onDelete
}: BlockEditorProps) {
  
  const [showBubbleMenu, setShowBubbleMenu] = useState(false);
  const [bubbleMenuPos, setBubbleMenuPos] = useState({ top: 0, left: 0 });
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Debounced handler needs to be defined BEFORE useEditor so it can be used inside onUpdate
  const debouncedOnChange = useMemo(
    () => debounce((html: string) => {
      onChange(html);
    }, 300), 
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
        // Handle Ctrl+Delete or Ctrl+Backspace to delete the whole note
        if ((event.ctrlKey || event.metaKey) && (event.key === 'Delete' || event.key === 'Backspace')) {
          event.preventDefault();
          onDelete?.();
          return true;
        }
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
            <div className="relative">
              <button
                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                className={`p-1.5 rounded hover:bg-[hsl(var(--muted))] ${editor.isActive('highlight') ? 'text-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/10' : 'text-[hsl(var(--muted-foreground))]'}`}
                title="Highlight"
              >
                <Highlighter className="w-4 h-4" />
              </button>
              {showHighlightPicker && (
                <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl z-50 min-w-[160px]"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-2 text-center">Highlight Color</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { color: 'rgba(254, 240, 138, 0.25)', name: 'Yellow' },
                      { color: 'rgba(187, 247, 208, 0.25)', name: 'Green' },
                      { color: 'rgba(147, 197, 253, 0.25)', name: 'Blue' },
                      { color: 'rgba(252, 165, 165, 0.25)', name: 'Red' },
                      { color: 'rgba(216, 180, 254, 0.25)', name: 'Purple' },
                      { color: 'rgba(253, 186, 116, 0.25)', name: 'Orange' },
                      { color: 'rgba(251, 207, 232, 0.25)', name: 'Pink' },
                      { color: 'rgba(94, 234, 212, 0.35)', name: 'Teal' },
                      { color: 'rgba(148, 163, 184, 0.4)', name: 'Gray' },
                    ].map((item) => (
                      <button
                        key={item.color}
                        onClick={() => {
                          editor.chain().focus().toggleHighlight({ color: item.color }).run();
                          setShowHighlightPicker(false);
                        }}
                        className="w-8 h-8 rounded-lg border-2 border-[hsl(var(--border))] hover:scale-105 hover:border-white/50 transition-all"
                        style={{ backgroundColor: item.color }}
                        title={item.name}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      editor.chain().focus().unsetHighlight().run();
                      setShowHighlightPicker(false);
                    }}
                    className="w-full mt-2 px-2 py-1 text-[10px] text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                  >
                    Remove highlight
                  </button>
                </div>
              )}
            </div>
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
