'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { SlashCommands } from '@/components/slides/extensions/SlashCommands';
import { CalloutExtension } from '@/components/slides/extensions/CalloutExtension';
import { FloatingToolbar } from '@/components/docs/doc_editor/FloatingToolbar';
import { cn } from '@/lib/utils';
import { DEFAULT_FONT_SIZE } from '@/components/slides/core/types';

/**
 * InlineCursor — a "naked" TipTap editor that appears as just a blinking cursor.
 *
 * - No box, no border, no padding, no controls.
 * - Auto-grows in width and height as the user types.
 * - Positioned absolutely at (x, y) on the slide canvas.
 * - On blur with empty content → self-destructs (calls onDiscard).
 * - On blur with content → commits (calls onCommit with HTML).
 * - Includes FloatingToolbar for text formatting (same as docs editor).
 */

interface InlineCursorProps {
  x: number;
  y: number;
  /** Pre-fill with existing content (for editing existing blocks) */
  initialContent?: string;
  /** Called when the user types content and blurs. Receives HTML string and dimensions. */
  onCommit: (html: string, dims?: { width: number; height: number }) => void;
  onDiscard: () => void;
  /** Called with live content updates (HTML). */
  onChange?: (html: string) => void;
  /** Called when the editor dimensions change (for auto-growing slide) */
  onDimensionsChange?: (width: number, height: number) => void;
  /** Zoom level of the parent container for correct sizing */
  zoom?: number;
  fontSize?: number;
  /** Background color class */
  color?: string;
  /** Text color (CSS color value) */
  textColor?: string;
  /** Constrain width to match block width (auto-grow/shrink if not set) */
  maxWidth?: number;
  /** Set a minimum width (for editing existing blocks — starts at stored width but can auto-grow) */
  initialMinWidth?: number;
  /** Fired when arrow keys are pressed while the editor is empty (to move the cursor across the canvas) */
  onMoveCursor?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

export function InlineCursor({ x, y, initialContent, onCommit, onDiscard, onChange, onDimensionsChange, zoom = 1, maxWidth, initialMinWidth, color, textColor, fontSize, onMoveCursor }: InlineCursorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isToolbarClickRef = useRef(false);

  // Floating toolbar state
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>({ top: 0, left: 0 });

  // Monitor dimensions for parent auto-resize
  useEffect(() => {
    if (!wrapperRef.current || !onDimensionsChange) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onDimensionsChange(entry.contentRect.width, entry.contentRect.height);
      }
    });

    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, [onDimensionsChange]);

  // Keep cursor in view when moving it with arrow keys
  useEffect(() => {
    if (wrapperRef.current) {
      // Use smooth block: nearest so it only scrolls if it's actually out of bounds
      wrapperRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [x, y]);

  // Ref pattern: TipTap's useEditor captures onUpdate at init time
  // Using a ref ensures the handler always calls the latest onChange prop
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-400 underline cursor-pointer hover:text-blue-300' },
      }),
      SlashCommands,
      CalloutExtension,
    ],
    content: initialContent || '',
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'outline-none max-w-none',
        style: `white-space: pre-wrap; word-break: break-word; max-width: 100%; margin: 0;`,
      },
      handleKeyDown: (view, event) => {
        if (!onMoveCursor) return false;
        
        // Only handle navigation if the editor is completely empty
        const text = view.state.doc.textContent;
        if (text.trim().length === 0) {
          if (event.key === 'ArrowUp') {
            onMoveCursor('up');
            return true;
          }
          if (event.key === 'ArrowDown') {
            onMoveCursor('down');
            return true;
          }
          if (event.key === 'ArrowLeft') {
            onMoveCursor('left');
            return true;
          }
          if (event.key === 'ArrowRight') {
            onMoveCursor('right');
            return true;
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current?.(editor.getHTML());
    },
    onBlur: () => {
      // CRITICAL: Capture dimensions synchronously BEFORE setTimeout.
      // External mice fire blur so fast that by the time setTimeout runs,
      // the DOM has already reflowed and offsetWidth/Height are stale/reduced.
      const capturedWidth = wrapperRef.current?.offsetWidth || 0;
      const capturedHeight = wrapperRef.current?.offsetHeight || 0;

      // Defer so the editor state is finalized
      setTimeout(() => {
        // Don't commit if user is clicking on the floating toolbar
        if (isToolbarClickRef.current) {
          isToolbarClickRef.current = false;
          return;
        }
        const html = editor?.getHTML() ?? '';
        const text = editor?.getText() ?? '';
        if (text.trim().length === 0) {
          onDiscard();
        } else {
          onCommit(html, {
            width: capturedWidth,
            height: capturedHeight
          });
        }
      }, 100);
    },
  });

  // Auto-focus on mount
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
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

  // Floating toolbar — track text selection (same pattern as docs editor)
  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (hasSelection) {
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);

        const toolbarWidth = 400;
        const left = Math.max(10, (start.left + end.left) / 2 - toolbarWidth / 2);
        const top = Math.max(10, start.top - 50);

        setToolbarPosition({ top, left });
        setShowFloatingToolbar(true);
      } else {
        setShowFloatingToolbar(false);
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        setShowFloatingToolbar(false);
      }, 200);
    };

    editor.on('selectionUpdate', updateToolbar);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('selectionUpdate', updateToolbar);
      editor.off('blur', handleBlur);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      ref={wrapperRef}
      className="absolute"
      style={{
        left: x,
        top: y,
        minWidth: initialMinWidth ? `${initialMinWidth}px` : '2px',
        maxWidth: maxWidth ? `${maxWidth}px` : '80%',
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        zIndex: 100,
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ProseMirror overrides for slide context — now in globals.css */}
      <div
        className={cn("inline-cursor-editor notion-editor rounded-lg transition-colors duration-200", color)}
        style={{
          color: textColor || undefined,
        }}
        onMouseDown={() => {
          // Guard: if clicking within the editor area, don't treat as toolbar
        }}
      >
        <EditorContent
          editor={editor}
          style={{
            minHeight: '1.6em',
            fontSize: `${fontSize || DEFAULT_FONT_SIZE}px`,
          }}
        />
      </div>

      {/* Floating Toolbar — appears on text selection */}
      {editor && (
        <div
          onMouseDown={() => {
            isToolbarClickRef.current = true;
          }}
        >
          <FloatingToolbar
            editor={editor}
            show={showFloatingToolbar}
            position={toolbarPosition}
          />
        </div>
      )}
    </div>
  );
}
