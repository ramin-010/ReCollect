'use client';

import React, { useRef, useEffect } from 'react';

interface TaskDescriptionEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function TaskDescriptionEditor({ 
  content, 
  onChange, 
  placeholder = 'Add description...' 
}: TaskDescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync content from parent
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (content !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = content;
      }
    }
    isInternalChange.current = false;
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result && editorRef.current) {
                const img = document.createElement('img');
                img.src = event.target.result as string;
                img.style.maxWidth = '280px';
                img.style.maxHeight = '196px';
                img.style.borderRadius = '6px';
                img.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                img.style.margin = '4px 0';
                img.style.display = 'block';
                
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  range.deleteContents();
                  range.insertNode(img);
                  range.setStartAfter(img);
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
                handleInput();
              }
            };
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    }
  };

  const isEmpty = !content || content === '<br>' || content === '<p></p>';

  return (
    <div className="relative pl-8">
      {isEmpty && (
        <div 
          className="absolute top-0 left-8 text-sm text-white/30 pointer-events-none select-none"
        >
          {placeholder}
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className="text-sm text-white/70 focus:outline-none max-h-[176px] overflow-y-auto min-h-[20px] empty:min-h-0"
        style={{ 
          wordBreak: 'break-word',
        }}
      />
    </div>
  );
}
