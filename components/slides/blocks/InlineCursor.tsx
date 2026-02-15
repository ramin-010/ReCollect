'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { SlashCommands } from '@/components/content/newCanvas/SlashCommands';
import { CalloutExtension } from '@/components/content/newCanvas/CalloutExtension';

/**
 * InlineCursor — a "naked" TipTap editor that appears as just a blinking cursor.
 *
 * - No box, no border, no padding, no controls.
 * - Auto-grows in width and height as the user types.
 * - Positioned absolutely at (x, y) on the slide canvas.
 * - On blur with empty content → self-destructs (calls onDiscard).
 * - On blur with content → commits (calls onCommit with HTML).
 */

interface InlineCursorProps {
  x: number;
  y: number;
  /** Pre-fill with existing content (for editing existing blocks) */
  initialContent?: string;
  /** Called when the user types content and blurs. Receives HTML string and dimensions. */
  onCommit: (html: string, dims?: { width: number; height: number }) => void;
  /** Called when the user blurs with no content (discard the cursor). */
  onDiscard: () => void;
  /** Called with live content updates (HTML). */
  onChange?: (html: string) => void;
  /** Zoom level of the parent container for correct sizing */
  zoom?: number;
  /** Font size in pixels (to match block scaling) */
  fontSize?: number;
  /** Constrain width to match block width */
  maxWidth?: number;
}

export function InlineCursor({ x, y, initialContent, onCommit, onDiscard, onChange, zoom = 1, fontSize = 14, maxWidth }: InlineCursorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }) as any,
      Placeholder.configure({
        placeholder: "Type '/' for commands...",
        includeChildren: true,
        showOnlyCurrent: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-500 underline cursor-pointer hover:text-blue-600' },
      }),
      SlashCommands,
      CalloutExtension,
    ],
    content: initialContent || '',
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'outline-none prose prose-sm dark:prose-invert max-w-none',
        style: `caret-color: hsl(var(--foreground)); color: hsl(var(--foreground)); font-size: ${fontSize}px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    onBlur: () => {
      // Defer so the editor state is finalized
      setTimeout(() => {
        const html = editor?.getHTML() ?? '';
        const text = editor?.getText() ?? '';
        if (text.trim().length === 0) {
          onDiscard();
        } else {
          onCommit(html, {
            width: wrapperRef.current?.offsetWidth || 0,
            height: wrapperRef.current?.offsetHeight || 0
          });
        }
      }, 0);
    },
  });

  // Auto-focus on mount
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        editor.commands.focus('end');
      });
    }
  }, [editor]);

  // Handle Escape key to discard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDiscard();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDiscard]);

  if (!editor) return null;

  return (
    <div
      ref={wrapperRef}
      className="absolute"
      style={{
        left: x,
        top: y,
        // No width constraint — grows with content
        minWidth: '2px',
        maxWidth: maxWidth ? `${maxWidth}px` : '80%',
        // No box styling at all
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        zIndex: 100,
        pointerEvents: 'auto',
      }}
      // Prevent click from bubbling to canvas (which would create another cursor)
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Strip all TipTap/ProseMirror default spacing */}
      <style>{`
        .inline-cursor-editor .ProseMirror {
          padding: 0 !important;
          margin: 0 !important;
          min-height: 0 !important;
          border: none !important;
          outline: none !important;
        }
        .inline-cursor-editor .ProseMirror p {
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      <div className="inline-cursor-editor">
        <EditorContent
          editor={editor}
          style={{
            minHeight: '1.6em',
          }}
        />
      </div>
    </div>
  );
}
