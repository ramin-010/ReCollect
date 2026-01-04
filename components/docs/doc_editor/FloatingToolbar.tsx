'use client';

import { useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, List, ListOrdered, Quote, Code, 
  Heading1, Heading2, Link as LinkIcon, Highlighter, 
  Underline as UnderlineIcon, Type
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { HIGHLIGHT_COLORS } from './constants';
import { ToolbarPosition } from './types';

interface FloatingToolbarProps {
  editor: Editor;
  show: boolean;
  position: ToolbarPosition;
}

export function FloatingToolbar({ editor, show, position }: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  // Prevent toolbar from losing focus when clicking buttons
  const preventBlur = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  if (!show) return null;

  return (
    <div 
      ref={toolbarRef}
      className="fixed z-[9999] flex items-center gap-0.5 p-1.5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-150"
      style={{ top: position.top, left: position.left }}
      onMouseDown={preventBlur}
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
              {HIGHLIGHT_COLORS.map((item) => (
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
  );
}
