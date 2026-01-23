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

  // Hydrate images with UI on load
  const hydrateImages = (container: HTMLElement) => {
    // Find all raw images that aren't already wrapped or are missing overlays
    const images = container.querySelectorAll('img');
    let hasChanges = false;

    images.forEach(img => {
      // If image is already in a container and has overlay, skip
      if (img.closest('.img-container') && img.parentElement?.querySelector('.img-overlay')) {
        return;
      }
      
      // Get the parent container if it exists, otherwise we'll wrap it
      let wrapper = img.closest('.img-container');
      
      // Create the overlay HTML
      const overlayHtml = `
      <div class="img-overlay" style="position: absolute; top: 0; right: 0; display: flex; gap: 4px; padding: 6px; opacity: 0; transition: opacity 0.2s;">
        <button class="img-expand-btn" style="width: 26px; height: 26px; border-radius: 6px; background: rgba(0,0,0,0.7); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
        <button class="img-delete-btn" style="width: 20px; height: 20px; border-radius: 6px; background: rgba(220,38,38,0.8); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>`;

      if (wrapper) {
        // Just add the overlay if wrapper exists but overlay is missing
        wrapper.insertAdjacentHTML('beforeend', overlayHtml);
      } else {
        // Wrap the image
        const newWrapper = document.createElement('div');
        newWrapper.className = 'img-container';
        newWrapper.contentEditable = 'false';
        newWrapper.style.cssText = 'position: relative; display: block; width: fit-content; margin: 8px 0;';
        
        img.parentNode?.insertBefore(newWrapper, img);
        newWrapper.appendChild(img);
        newWrapper.insertAdjacentHTML('beforeend', overlayHtml);
        hasChanges = true;
      }
    });
    
    return hasChanges;
  };

  // Sync content from parent and hydrate
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (content !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = content;
        // Hydrate any static images with UI controls
        hydrateImages(editorRef.current);
      }
    }
    isInternalChange.current = false;
  }, [content]);

  // Handle clicks on expand and delete buttons
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
    
    // Check if clicked on delete button
    if (target.classList.contains('img-delete-btn') || target.closest('.img-delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      // Find the parent container and remove it
      const container = target.closest('.img-container');
      if (container && editorRef.current) {
        container.remove();
        // Trigger input event to sync state
        isInternalChange.current = true;
        onChange(editorRef.current.innerHTML);
      }
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Create image HTML with expand and delete button overlays
  const createImageHtml = (src: string) => {
    return `<div class="img-container" contenteditable="false" style="position: relative; display: block; width: fit-content; margin: 8px 0;">
      <img src="${src}" style="max-width: 280px; max-height: 196px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1); display: block; cursor: default;">
      <div class="img-overlay" style="position: absolute; top: 0; right: 0; display: flex; gap: 4px; padding: 6px; opacity: 0; transition: opacity 0.2s;">
        <button class="img-expand-btn" style="width: 26px; height: 26px; border-radius: 6px; background: rgba(0,0,0,0.7); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
        <button class="img-delete-btn" style="width: 20px; height: 20px; border-radius: 6px; background: rgba(220,38,38,0.8); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div><p style="margin: 0; min-height: 1em;"></p>`;
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
                  let lastNode: Node | null = null;
                  while (temp.firstChild) {
                    lastNode = temp.firstChild;
                    frag.appendChild(temp.firstChild);
                  }
                  range.insertNode(frag);
                  
                  // Move cursor after the inserted content and clear selection
                  if (lastNode) {
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                  }
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
    <div className="relative ">
      {isEmpty && (
        <div 
          className="absolute top-0  text-sm  text-white/30 pointer-events-none select-none"
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
      
      {/* CSS for hover effect on image overlay */}
      <style jsx global>{`
        .img-container {
          user-select: none;
        }
        .img-container::selection,
        .img-container *::selection {
          background: transparent;
        }
        .img-container:hover .img-overlay {
          opacity: 1 !important;
        }
        .img-expand-btn:hover {
          background: rgba(0,0,0,0.9) !important;
        }
        .img-delete-btn:hover {
          background: rgba(185,28,28,1) !important;
        }
      `}</style>
    </div>
  );
}
