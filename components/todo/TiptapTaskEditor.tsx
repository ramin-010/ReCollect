'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { cn } from '@/lib/utils';
import { TaskImageExtension } from './TaskImageExtension';
import { TaskSlashCommands } from './TaskSlashCommands';
import { TaskSubtaskExtension } from './TaskSubtaskExtension';
import { createTaskMentionExtension } from './TaskMentionExtension';
import { createTaskLabelExtension } from './TaskLabelExtension';
import { createTaskHighlightExtension } from './TaskHighlightExtension';

interface TiptapTaskEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageClick?: (src: string) => void;
  autoFocus?: boolean;
  workspaceMembers?: any[];
  onSelectAssignee?: (user: any) => void;
  onSelectLabel?: (label: any) => void;
  onMentionDelete?: (name: string) => void;
  onLabelDelete?: (name: string) => void;
  placeholder?: string;
}

export function TiptapTaskEditor({
  content,
  onChange,
  onImageClick,
  placeholder = 'Add description... Write or type / for command and AI action',
  autoFocus = false,
  workspaceMembers = [],
  onSelectAssignee,
  onSelectLabel,
  onMentionDelete,
  onLabelDelete,
}: TiptapTaskEditorProps) {
  const isInternalChange = useRef(false);

  // ── Refs to hold the latest callback values ──
  // useEditor creates extensions ONCE at mount. If we pass callbacks directly,
  // they are captured at that moment and never update (stale closure).
  // By storing them in refs, the extension reads the LATEST value at runtime.
  const onSelectAssigneeRef = useRef(onSelectAssignee);
  const onSelectLabelRef = useRef(onSelectLabel);
  const onMentionDeleteRef = useRef(onMentionDelete);
  const onLabelDeleteRef = useRef(onLabelDelete);

  useEffect(() => { onSelectAssigneeRef.current = onSelectAssignee; }, [onSelectAssignee]);
  useEffect(() => { onSelectLabelRef.current = onSelectLabel; }, [onSelectLabel]);
  useEffect(() => { onMentionDeleteRef.current = onMentionDelete; }, [onMentionDelete]);
  useEffect(() => { onLabelDeleteRef.current = onLabelDelete; }, [onLabelDelete]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable things we don't strictly need yet to keep it lightweight, 
        // or just use defaults. We'll add task lists later when building / commands.
        heading: false,
      }) as any,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TaskSubtaskExtension,
      TaskSlashCommands,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TaskImageExtension,
      createTaskMentionExtension({
        workspaceMembers,
        onSelectAssignee: (user: any) => onSelectAssigneeRef.current?.(user),
      }),
      createTaskLabelExtension({
        onSelectLabel: (label: any) => onSelectLabelRef.current?.(label),
      }),
      createTaskHighlightExtension({
        onMentionDelete: (name: string) => onMentionDeleteRef.current?.(name),
        onLabelDelete: (name: string) => onLabelDeleteRef.current?.(name),
      }),
    ],
    content: content,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      const html = editor.getHTML();
      // If the editor is functionally empty, return empty string so our parent knows
      if (editor.isEmpty) {
        onChange('');
      } else {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-task-description focus:outline-none min-h-[20px] max-w-full text-sm text-white/70',
      },
      handleClickOn: (view, pos, node, nodePos, event, direct) => {
        return false;
      }
    },
  });

  // Listen for custom expand event from TaskImageComponent NodeView
  useEffect(() => {
    if (!onImageClick) return;
    
    const handleExpandEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ src: string }>;
      if (customEvent.detail && customEvent.detail.src) {
        onImageClick(customEvent.detail.src);
      }
    };
    
    window.addEventListener('task-image-expand', handleExpandEvent);
    return () => window.removeEventListener('task-image-expand', handleExpandEvent);
  }, [onImageClick]);

  // Sync external content changes into the editor
  useEffect(() => {
    if (editor && !isInternalChange.current) {
      if (content !== editor.getHTML() && content !== undefined) {
        // If content is empty string but editor is `<p></p>`, we don't need to update
        if (!content && editor.isEmpty) return;
        
        // Defer to microtask to avoid flushSync error when called during React's commit phase
        queueMicrotask(() => {
          editor.commands.setContent(content, { emitUpdate: false } as any);
        });
      }
    }
    isInternalChange.current = false;
  }, [content, editor]);

  // Handle paste events specifically for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result && editor) {
                const src = event.target.result as string;
                editor.commands.insertTaskImage({ src });
              }
            };
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    }
  }, [editor]);

  return (
    <div className="relative w-full cursor-text" onClick={() => editor?.commands.focus()}>
      <div onPaste={handlePaste} className="w-full">
        <EditorContent editor={editor} className="w-full" />
      </div>
      
      {/* 
        CRITICAL TIPTAP STYLES FOR MINIMAL HEIGHT 
        The default Tiptap ProseMirror styling often forces `<p>` tags to have large margins.
        By zeroing out the paragraph margin, the editor can be as small as 20px in height.
      */}
      <style jsx global>{`
        .tiptap {
          padding : 0px;
        }
        .tiptap-task-description.ProseMirror {
          min-height: 10px;
          outline: none;
          word-break: break-word;
        }
        
        /* Remove default margins so the height collapses down when used in TaskInput */
        .tiptap-task-description.ProseMirror > p {
          margin: 0;
          line-height: 1.5;
        }

        /* Placeholder styling */
        .tiptap-task-description p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(255, 255, 255, 0.3);
          pointer-events: none;
          height: 0;
        }
        
        /* Lists */
        .tiptap-task-description ul {
          list-style-type: disc;
          padding-left: 1.25rem;
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
        .tiptap-task-description ol {
          list-style-type: decimal;
          padding-left: 1.25rem;
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
        
        /* Basic formatting */
        .tiptap-task-description strong {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }
        .tiptap-task-description em {
          font-style: italic;
        }
        .tiptap-task-description code {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875em;
        }

        /* Tippy / Slash Commands Menu */
        .tippy-box {
          background-color: transparent !important;
          border: none !important;
          border-radius: 0 !important;
        }
        .tippy-content {
          padding: 0 !important;
        }
      `}</style>
    </div>
  );
}
