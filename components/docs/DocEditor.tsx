'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { Doc, useDocStore } from '@/lib/store/docStore';
import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { ChevronLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';

interface DocEditorProps {
  doc: Doc;
  onBack: () => void;
}

export function DocEditor({ doc, onBack }: DocEditorProps) {
  const { updateDoc } = useDocStore();
  const { resolvedTheme } = useTheme();
  const [title, setTitle] = useState(doc.title);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const contentRef = useRef<string>(doc.content);

  // Parse initial content
  const initialContent = React.useMemo(() => {
    try {
      const parsed = JSON.parse(doc.content);
      return parsed.length > 0 ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [doc._id]);

  // Create BlockNote editor
  const editor = useCreateBlockNote({
    initialContent,
  });

  // Save function - called manually
  const saveDocument = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      setIsSaving(true);
      await axiosInstance.patch(`/api/docs/${doc._id}`, { 
        content: contentRef.current,
        title 
      });
      updateDoc(doc._id, { content: contentRef.current, title });
      setHasUnsavedChanges(false);
      toast.success('Saved');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [doc._id, title, hasUnsavedChanges, updateDoc]);

  // Handle back with save
  const handleBack = useCallback(async () => {
    if (hasUnsavedChanges) {
      await saveDocument();
    }
    onBack();
  }, [hasUnsavedChanges, saveDocument, onBack]);

  // Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveDocument]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value || 'Untitled';
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  // Handle content changes
  const handleChange = useCallback(() => {
    const blocks = editor.document;
    contentRef.current = JSON.stringify(blocks);
    setHasUnsavedChanges(true);
  }, [editor]);

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))]">
      {/* Minimal Floating Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Back
        </Button>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-400/80">Unsaved changes</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={saveDocument}
            disabled={!hasUnsavedChanges || isSaving}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor Content - Notion Style */}
      <div className="flex-1 overflow-y-auto pt-16">
        <div className="max-w-3xl mx-auto px-16 py-12">
          {/* Large Emoji Icon */}
          <div className="mb-4">
            <span className="text-7xl cursor-pointer hover:bg-[hsl(var(--muted))] rounded-lg p-2 inline-block transition-colors">
              {doc.emoji}
            </span>
          </div>

          {/* Title Input - Notion Style */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="w-full text-[42px] font-bold bg-transparent border-none outline-none placeholder:text-[hsl(var(--muted-foreground))/50] mb-8 leading-tight"
          />

          {/* BlockNote Editor - Custom Dark Styling */}
          <div className="doc-editor-wrapper">
            <style jsx global>{`
              .doc-editor-wrapper .bn-editor {
                background: transparent !important;
                font-family: inherit;
              }
              .doc-editor-wrapper .bn-container {
                background: transparent !important;
              }
              .doc-editor-wrapper .bn-block-outer {
                background: transparent !important;
              }
              .doc-editor-wrapper [data-content-type] {
                background: transparent !important;
              }
              .doc-editor-wrapper .bn-inline-content {
                font-size: 16px;
                line-height: 1.7;
              }
              .doc-editor-wrapper .ProseMirror {
                padding: 0 !important;
              }
              .doc-editor-wrapper .bn-side-menu {
                opacity: 0;
                transition: opacity 0.15s;
              }
              .doc-editor-wrapper:hover .bn-side-menu {
                opacity: 1;
              }
            `}</style>
            <BlockNoteView
              editor={editor}
              theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* Bottom Keyboard Hint */}
      <div className="px-6 py-2 text-xs text-[hsl(var(--muted-foreground))/50] text-center shrink-0">
        <kbd className="px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] font-mono text-[10px]">Ctrl+S</kbd> to save
      </div>
    </div>
  );
}
