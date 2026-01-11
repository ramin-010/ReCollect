'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Clock, Copy, Download, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { ResizableImage } from '@/lib/extensions/ResizableImage';
import { motion, AnimatePresence } from 'framer-motion';

interface SyncConflictDialogProps {
  open: boolean;
  onClose: () => void;
  localUpdatedAt: number;
  serverUpdatedAt: number;
  localContent?: string;
  serverContent?: string;
  onAcceptServer: () => void;
  onKeepMine: () => void;
  onSaveAsNew: () => void;
}

function ReadOnlyDocPreview({ content, label }: { content?: string; label: string }) {
  const [mounted, setMounted] = useState(false);

  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      } as any) as any,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-400 underline' },
      }),
      ResizableImage,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TextStyle,
      Color,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[200px] pro-prose',
      },
    },
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (editor && content) {
      try {
        const { yjsStateToJson } = require('@/lib/utils/yjsConverter');
        editor.commands.setContent(yjsStateToJson(content));
      } catch (e) {
        console.error(`Failed to load ${label} content:`, e);
      }
    }
  }, [editor, content, label]);

  if (!mounted || !editor) {
    return (
      <div className="flex items-center justify-center h-48 text-[hsl(var(--muted-foreground))]">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  return (
    <div className="prose dark:prose-invert max-w-none">
      <EditorContent editor={editor} />
    </div>
  );
}

export function SyncConflictDialog({
  open,
  onClose,
  localUpdatedAt,
  serverUpdatedAt,
  localContent,
  serverContent,
  onAcceptServer,
  onKeepMine,
  onSaveAsNew,
}: SyncConflictDialogProps) {
  if (!open) return null;

  const localDate = format(new Date(localUpdatedAt), 'MMM d, h:mm a');
  const serverDate = format(new Date(serverUpdatedAt), 'MMM d, h:mm a');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="relative bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl shadow-2xl w-[95vw] max-w-7xl h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                Resolve Conflict
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                Choose which version to keep
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => { onKeepMine(); onClose(); }}
                className="px-4 py-2 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30"
              >
                <FileText className="w-4 h-4 mr-2" />
                Keep Local
              </Button>
              
              <Button
                onClick={() => { onAcceptServer(); onClose(); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Accept Server
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => { onSaveAsNew(); onClose(); }}
                className="px-4 py-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50"
              >
                <Copy className="w-4 h-4 mr-2" />
                Save as New
              </Button>
              
              <button
                onClick={onClose}
                className="p-2 ml-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-[hsl(var(--border))]">
            {/* Local */}
            <div className="flex flex-col overflow-hidden">
              <div className="shrink-0 px-6 py-2.5 border-b border-[hsl(var(--border))] flex items-center justify-between bg-emerald-500/5">
                <span className="font-medium text-emerald-400">Local Version (You)</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  <Clock className="w-3 h-3 inline mr-1" />{localDate}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <ReadOnlyDocPreview content={localContent} label="local" />
              </div>
            </div>

            {/* Server */}
            <div className="flex flex-col overflow-hidden">
              <div className="shrink-0 px-6 py-2.5 border-b border-[hsl(var(--border))] flex items-center justify-between bg-blue-500/5">
                <span className="font-medium text-blue-400">Server Version</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  <Clock className="w-3 h-3 inline mr-1" />{serverDate}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <ReadOnlyDocPreview content={serverContent} label="server" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
