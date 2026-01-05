'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import {TextStyle} from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import AutoJoiner from 'tiptap-extension-auto-joiner';
import { SlashCommands } from '../components/docs/SlashCommands';
import { Doc, useDocStore } from '@/lib/store/docStore';
import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';
import { 
  ChevronLeft, Save, Bold, Italic, List, ListOrdered, Quote, Code, 
  Heading1, Heading2, Undo, Redo, Link as LinkIcon, Image as ImageIcon,
  Highlighter, CheckSquare, Underline as UnderlineIcon, ImagePlus, X, Type
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';

// Available cover images
const COVER_OPTIONS = [
  { id: 'cover1', src: '/cover/cover1.png', name: 'Gradient 1' },
  { id: 'cover2', src: '/cover/download (5).jpeg', name: 'Abstract 1' },
  { id: 'cover3', src: '/cover/download (6).jpeg', name: 'Abstract 2' },
  { id: 'cover4', src: '/cover/download (7).jpeg', name: 'Abstract 3' },
  { id: 'cover5', src: '/cover/ni.jpeg', name: 'Minimal' },
];

interface DocEditorProps {
  doc: Doc;
  onBack: () => void;
}

export function DocEditor({ doc, onBack }: DocEditorProps) {
  const { updateDoc } = useDocStore();
  const [title, setTitle] = useState(doc.title);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const contentRef = useRef<string>(doc.content);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const getInitialContent = useCallback(() => {
    try {
      const parsed = JSON.parse(doc.content);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      return '';
    } catch {
      return doc.content || '';
    }
  }, [doc.content]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      } as any) as any,
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
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-4',
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
      TextStyle,
      Color,
      GlobalDragHandle.configure({
        dragHandleWidth: 24,
        scrollTreshold: 100,
      }),
      AutoJoiner.configure({
        elementsToJoin: ['bulletList', 'orderedList'],
      }),
      SlashCommands,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      contentRef.current = JSON.stringify(editor.getJSON());
      setHasUnsavedChanges(true);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[900px]',
      },
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && editor) {
      const content = getInitialContent();
      if (content) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [mounted, editor, getInitialContent]);

  // Floating toolbar - show on text selection
  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      
      if (hasSelection) {
        // Get the selection coordinates
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        
        // Calculate toolbar position (centered above selection)
        const toolbarWidth = 400; // approximate
        const left = Math.max(10, (start.left + end.left) / 2 - toolbarWidth / 2);
        const top = Math.max(10, start.top - 50);
        
        setToolbarPosition({ top, left });
        setShowFloatingToolbar(true);
      } else {
        setShowFloatingToolbar(false);
      }
    };

    editor.on('selectionUpdate', updateToolbar);
    editor.on('blur', () => {
      // Small delay to allow clicking toolbar buttons
      setTimeout(() => {
        if (!toolbarRef.current?.contains(document.activeElement)) {
          setShowFloatingToolbar(false);
        }
      }, 150);
    });

    return () => {
      editor.off('selectionUpdate', updateToolbar);
    };
  }, [editor]);

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

  const handleBack = useCallback(async () => {
    if (hasUnsavedChanges) {
      await saveDocument();
    }
    onBack();
  }, [hasUnsavedChanges, saveDocument, onBack]);

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

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  if (!mounted || !editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-[hsl(var(--muted-foreground))]">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))]">
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

      <div className="flex-1 overflow-y-auto pt-16">
        {/* Cover Image Section */}
        {coverImage ? (
          <div className="relative group w-full h-48 mb-0">
            <img 
              src={coverImage} 
              alt="Document cover" 
              className="w-full h-full object-cover"
            />
            {/* Cover Controls - appear on hover */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCoverPicker(true)}
                className="bg-black/50 hover:bg-black/70 text-white text-xs backdrop-blur-sm"
              >
                Change cover
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCoverImage(null); setHasUnsavedChanges(true); }}
                className="bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-8 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCoverPicker(true)}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-sm opacity-60 hover:opacity-100 transition-opacity"
              leftIcon={<ImagePlus className="h-4 w-4" />}
            >
              Add cover
            </Button>
          </div>
        )}

        {/* Cover Picker Dropdown */}
        {showCoverPicker && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-32" onClick={() => setShowCoverPicker(false)}>
            <div 
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl p-4 w-[400px] max-h-[320px] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">Choose a cover</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCoverPicker(false)}
                  className="h-6 w-6 p-0 text-[hsl(var(--muted-foreground))]"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {COVER_OPTIONS.map((cover) => (
                  <button
                    key={cover.id}
                    onClick={() => {
                      setCoverImage(cover.src);
                      setShowCoverPicker(false);
                      setHasUnsavedChanges(true);
                    }}
                    className={`relative h-16 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                      coverImage === cover.src 
                        ? 'border-amber-500 ring-2 ring-amber-500/30' 
                        : 'border-transparent hover:border-[hsl(var(--border))]'
                    }`}
                  >
                    <img 
                      src={cover.src} 
                      alt={cover.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              {coverImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCoverImage(null);
                    setShowCoverPicker(false);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full mt-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Remove cover
                </Button>
              )}
            </div>
          </div>
        )}

        <div className={`max-w-6xl mx-auto px-8 ${coverImage ? ' pt-0' : 'pt-4'} py-10 rounded-lg`}>

          {/* Document Title */}
          <div className="mb-6 pl-4">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="New Page"
              className="w-full text-[62px] font-bold bg-transparent border-none outline-none placeholder:text-[hsl(var(--muted-foreground))/50] mb-2  leading-tight"
              style={{ fontFamily: '"Noto Sans", "Roboto", sans-serif' }}
            />
            <div className="w-16 h-1 bg-amber-500 rounded-full" />
          </div>

          {/* Floating Toolbar - appears on text selection */}
          {showFloatingToolbar && editor && (
            <div 
              ref={toolbarRef}
              className="fixed z-50 flex items-center gap-0.5 p-1.5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-150"
              style={{ top: toolbarPosition.top, left: toolbarPosition.left }}
            >
              <Button type="button" variant={editor.isActive('bold') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className="h-7 w-7 p-0">
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('italic') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className="h-7 w-7 p-0">
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('underline') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className="h-7 w-7 p-0">
                <UnderlineIcon className="h-3.5 w-3.5" />
              </Button>
              <div className="relative">
                <Button 
                  type="button" 
                  variant={editor.isActive('highlight') ? 'primary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setShowHighlightPicker(!showHighlightPicker)} 
                  className="h-7 w-7 p-0"
                >
                  <Highlighter className="h-3.5 w-3.5" />
                </Button>
                {showHighlightPicker && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl z-50 min-w-[160px]">
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
                          className="w-10 h-10 rounded-lg border-2 border-[hsl(var(--border))] hover:scale-105 hover:border-white/50 transition-all"
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
                      className="w-full mt-3 px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                    >
                      Remove highlight
                    </button>
                  </div>
                )}
              </div>
              <div className="w-px h-4 bg-[hsl(var(--border))] mx-0.5" />
              <Button type="button" variant={editor.isActive('paragraph') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setParagraph().run()} className="h-7 w-7 p-0" title="Normal text">
                <Type className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('heading', { level: 1 }) ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="h-7 w-7 p-0">
                <Heading1 className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('heading', { level: 2 }) ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="h-7 w-7 p-0">
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-[hsl(var(--border))] mx-0.5" />
              <Button type="button" variant={editor.isActive('bulletList') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className="h-7 w-7 p-0">
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('orderedList') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className="h-7 w-7 p-0">
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-[hsl(var(--border))] mx-0.5" />
              <Button type="button" variant={editor.isActive('blockquote') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} className="h-7 w-7 p-0">
                <Quote className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('codeBlock') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className="h-7 w-7 p-0">
                <Code className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('link') ? 'primary' : 'ghost'} size="sm" onClick={addLink} className="h-7 w-7 p-0">
                <LinkIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Editor */}
          <div className="notion-editor">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="px-6 py-2 text-xs text-[hsl(var(--muted-foreground))/50] text-center shrink-0">
        <kbd className="px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] font-mono text-[10px]">Ctrl+S</kbd> to save
        <span className="mx-2">•</span>
        <span>Type <kbd className="px-1 py-0.5 rounded bg-[hsl(var(--muted))] font-mono text-[10px]">/</kbd> for commands</span>
      </div>

      {/* Global Notion-like Styles */}
      <style jsx global>{`
        /* Drag Handle - from Novel */
        .drag-handle {
          position: fixed;
          opacity: 1;
          transition: opacity ease-in 0.2s;
          border-radius: 0.25rem;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10' style='fill: rgba(255, 255, 255, 0.5)'%3E%3Cpath d='M3,2 C2.44771525,2 2,1.55228475 2,1 C2,0.44771525 2.44771525,0 3,0 C3.55228475,0 4,0.44771525 4,1 C4,1.55228475 3.55228475,2 3,2 Z M3,6 C2.44771525,6 2,5.55228475 2,5 C2,4.44771525 2.44771525,4 3,4 C3.55228475,4 4,4.44771525 4,5 C4,5.55228475 3.55228475,6 3,6 Z M3,10 C2.44771525,10 2,9.55228475 2,9 C2,8.44771525 2.44771525,8 3,8 C3.55228475,8 4,8.44771525 4,9 C4,9.55228475 3.55228475,10 3,10 Z M7,2 C6.44771525,2 6,1.55228475 6,1 C6,0.44771525 6.44771525,0 7,0 C7.55228475,0 8,0.44771525 8,1 C8,1.55228475 7.55228475,2 7,2 Z M7,6 C6.44771525,6 6,5.55228475 6,5 C6,4.44771525 6.44771525,4 7,4 C7.55228475,4 8,4.44771525 8,5 C8,5.55228475 7.55228475,6 7,6 Z M7,10 C6.44771525,10 6,9.55228475 6,9 C6,8.44771525 6.44771525,8 7,8 C7.55228475,8 8,8.44771525 8,9 C8,9.55228475 7.55228475,10 7,10 Z'%3E%3C/path%3E%3C/svg%3E");
          background-size: calc(0.5em + 0.375rem) calc(0.5em + 0.375rem);
          background-repeat: no-repeat;
          background-position: center;
          width: 1.2rem;
          height: 1.5rem;
          z-index: 50;
          cursor: grab;
        }
        .drag-handle:hover {
          background-color: rgba(255, 255, 255, 0.1);
          transition: background-color 0.2s;
        }
        .drag-handle:active {
          background-color: rgba(255, 255, 255, 0.2);
          cursor: grabbing;
        }
        .drag-handle.hide {
          opacity: 0;
          pointer-events: none;
        }

        /* Slash Command Menu */
        .slash-command-menu {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
          padding: 0.5rem;
          width: 280px;
          max-height: 320px;
          overflow-y: auto;
        }
        .slash-command-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.5rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background-color 0.15s;
          background: transparent;
          border: none;
          text-align: left;
        }
        .slash-command-item:hover, .slash-command-item.is-selected {
          background: hsl(var(--accent));
        }
        .slash-command-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 0.375rem;
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          flex-shrink: 0;
        }
        .slash-command-text {
          display: flex;
          flex-direction: column;
        }
        .slash-command-title {
          font-weight: 500;
          font-size: 0.875rem;
          color: hsl(var(--foreground));
        }
        .slash-command-description {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }


        /* Editor Styles */
        .notion-editor .ProseMirror {
          font-size: 16px;
          line-height: 1.75;
          color: hsl(var(--foreground));
        }
        .notion-editor .ProseMirror > * + * {
          margin-top: 0.75em;
        }
        .notion-editor .ProseMirror p.is-empty::before,
        .notion-editor .ProseMirror h1.is-empty::before,
        .notion-editor .ProseMirror h2.is-empty::before,
        .notion-editor .ProseMirror h3.is-empty::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
          pointer-events: none;
          height: 0;
        }
        .notion-editor .ProseMirror h1,
        .notion-editor .ProseMirror h2,
        .notion-editor .ProseMirror h3 {
          color: #FFFFFF;
        }
        .notion-editor .ProseMirror p,
        .notion-editor .ProseMirror li {
          color: #b6b4b4ff;
          margin-left: 0;
          padding-left: 0;
        }
        .notion-editor .ProseMirror p {
          margin: 0.5rem 0;
        }
        .notion-editor .ProseMirror h1,
        .notion-editor .ProseMirror h2,
        .notion-editor .ProseMirror h3 {
          margin-left: 0;
          padding-left: 0;
        }
        .notion-editor .ProseMirror h1 {
          font-size: 2.25rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        .notion-editor .ProseMirror h2 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }
        .notion-editor .ProseMirror mark {
          background-color: transparent;
          color: inherit;
          padding: 0;
          margin: 0;
          display: inline;
        }
        .notion-editor .ProseMirror h3 {
          font-size: 1.375rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .notion-editor .ProseMirror ul:not([data-type="taskList"]), 
        .notion-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .notion-editor .ProseMirror ul:not([data-type="taskList"]) {
          list-style-type: disc;
        }
        .notion-editor .ProseMirror ol {
          list-style-type: decimal;
        }
        .notion-editor .ProseMirror ul:not([data-type="taskList"]) li::marker,
        .notion-editor .ProseMirror ol li::marker {
          color: hsl(var(--muted-foreground));
        }
        .notion-editor .ProseMirror li {
          margin: 0.25rem 0;
        }
        .notion-editor .ProseMirror li p {
          margin: 0;
        }
        .notion-editor .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .notion-editor .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .notion-editor .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .notion-editor .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
          width: 16px;
          height: 16px;
          min-width: 16px;
          min-height: 16px;
          accent-color: hsl(var(--primary));
          cursor: pointer;
          margin: 0;
        }
        .notion-editor .ProseMirror blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1.5rem 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        .notion-editor .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: ui-monospace, monospace;
        }
        .notion-editor .ProseMirror pre {
          background: hsl(var(--muted));
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
          overflow-x: auto;
          font-family: ui-monospace, monospace;
        }
        .notion-editor .ProseMirror pre code {
          background: none;
          padding: 0;
        }
        .notion-editor .ProseMirror hr {
          border: none;
          border-top: 2px solid hsl(var(--border));
          margin: 2rem 0;
        }
        .notion-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .notion-editor .ProseMirror mark {
          background-color: transparent;
          color: #efecece5 !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 0 !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
