'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface TaskDescriptionEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageClick?: (src: string) => void;
  placeholder?: string;
}

export function TaskDescriptionEditor({ 
  content, 
  onChange, 
  onImageClick,
  placeholder = 'Add description...' 
}: TaskDescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const onImageClickRef = useRef(onImageClick);

  // Keep callback ref updated
  useEffect(() => {
    onImageClickRef.current = onImageClick;
  }, [onImageClick]);

  // Sync content from parent
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (content !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = content;
      }
    }
    isInternalChange.current = false;
  }, [content]);

  // Handle clicks on expand buttons
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicked on expand button or its parent
    if (target.classList.contains('img-expand-btn') || target.closest('.img-expand-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      // Find the parent container and get the image src
      const container = target.closest('.img-container');
      const img = container?.querySelector('img');
      if (img && onImageClickRef.current) {
        onImageClickRef.current(img.src);
      }
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Create image HTML with expand button overlay
  const createImageHtml = (src: string) => {
    return `<div class="img-container" contenteditable="false" style="position: relative; display: inline-block; margin: 4px 0;">
      <img src="${src}" style="max-width: 280px; max-height: 196px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1); display: block; cursor: default;">
      <button class="img-expand-btn" style="position: absolute; bottom: 8px; right: 8px; width: 28px; height: 28px; border-radius: 6px; background: rgba(0,0,0,0.6); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"></polyline>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
      </button>
    </div>`;
  };

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
              if (event.target?.result && editorRef.current) {
                const imgHtml = createImageHtml(event.target.result as string);
                
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  range.deleteContents();
                  
                  // Insert HTML
                  const temp = document.createElement('div');
                  temp.innerHTML = imgHtml;
                  const frag = document.createDocumentFragment();
                  while (temp.firstChild) {
                    frag.appendChild(temp.firstChild);
                  }
                  range.insertNode(frag);
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
  }, [handleInput]);

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
        onClick={handleClick}
        className="text-sm text-white/70 focus:outline-none max-h-[176px] overflow-y-auto min-h-[20px] empty:min-h-0"
        style={{ 
          wordBreak: 'break-word',
        }}
      />
      
      {/* CSS for hover effect on expand button */}
      <style jsx global>{`
        .img-container:hover .img-expand-btn {
          opacity: 1 !important;
        }
        .img-expand-btn:hover {
          background: rgba(0,0,0,0.8) !important;
        }
      `}</style>
    </div>
  );
}
