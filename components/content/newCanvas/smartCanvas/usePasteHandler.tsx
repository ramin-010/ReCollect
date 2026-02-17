import { useEffect, RefObject } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { imageStorage } from '@/lib/storage/imageStorage';
import { BlockData } from './types';

/** 
 * Enhanced auto-detection: determines what type of content was pasted.
 * Returns the detected block type and optional metadata.
 */
function detectContentType(text: string): { type: 'embed' | 'code' | 'text'; language?: string } {
  const trimmed = text.trim();
  
  // 1. URL Detection (expanded patterns)
  const urlPattern = /^(https?:\/\/|www\.)[^\s]+$/i;
  if (urlPattern.test(trimmed)) {
    return { type: 'embed' };
  }

  // 2. Code Detection — multi-signal scoring system
  let codeScore = 0;
  const lines = trimmed.split('\n');
  
  // Signal: Shebang line
  if (/^#!\//.test(trimmed)) codeScore += 5;
  
  // Signal: Import/export/require statements
  if (/\b(import\s+.*from|export\s+(default\s+)?|require\s*\(|from\s+\w+\s+import)/m.test(trimmed)) codeScore += 3;
  
  // Signal: Function/class/variable declarations
  if (/\b(const|let|var|function|class|def|fn|func|pub|async|interface|type|enum|struct)\s+\w+/m.test(trimmed)) codeScore += 2;
  
  // Signal: Brackets/braces density
  const bracketCount = (trimmed.match(/[{}()\[\]]/g) || []).length;
  if (bracketCount > 4) codeScore += 2;
  if (bracketCount > 10) codeScore += 1;
  
  // Signal: Semicolons at line endings (strong indicator)
  const semiLines = lines.filter(l => /;\s*$/.test(l.trim())).length;
  if (semiLines > 1) codeScore += 2;
  
  // Signal: Indentation patterns (2 or 4 spaces consistently)
  const indentedLines = lines.filter(l => /^(\s{2}|\s{4}|\t)/.test(l)).length;
  if (indentedLines > lines.length * 0.3) codeScore += 2;
  
  // Signal: Common operators
  if (/[=!<>]{2,}|=>|->|::|\.\.\.|\?\.|\?\?/.test(trimmed)) codeScore += 2;
  
  // Signal: Language-specific keywords
  if (/\b(return|if|else|for|while|switch|case|try|catch|throw|new|this|self|None|True|False|null|undefined|nil|void)\b/.test(trimmed)) codeScore += 1;
  
  // Signal: HTML tags (but full HTML docs score differently)
  if (/<\/?[a-z][\w-]*[^>]*>/i.test(trimmed)) codeScore += 2;
  
  // Signal: CSS properties
  if (/[\.\#@][\w-]+\s*\{|:\s*(flex|grid|block|none|relative|absolute|fixed)/.test(trimmed)) codeScore += 3;
  
  // Signal: SQL keywords
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER|FROM|WHERE|JOIN|GROUP\s+BY)\b/i.test(trimmed)) codeScore += 4;
  
  // Signal: JSON (starts with { or [ and valid JSON structure)
  if (/^\s*[\{\[]/.test(trimmed)) {
    try { JSON.parse(trimmed); codeScore += 5; } catch {}
  }
  
  // Signal: Python-specific
  if (/\b(def\s+\w+\s*\(|class\s+\w+.*:|import\s+\w+|from\s+\w+|print\s*\(|elif\b|self\.|__\w+__)/m.test(trimmed)) codeScore += 3;
  
  // Signal: Shell/Bash
  if (/^\$\s|^#\s|^\w+=|^(sudo|npm|yarn|pip|git|docker|curl|wget)\s/m.test(trimmed)) codeScore += 3;
  
  // Signal: Multiple lines (code usually has multiple lines)
  if (lines.length > 2) codeScore += 1;
  if (lines.length > 5) codeScore += 1;
  
  // Signal: No natural language prose indicators (negative signals)
  const avgWordsPerLine = lines.reduce((acc, l) => acc + l.trim().split(/\s+/).length, 0) / lines.length;
  if (avgWordsPerLine > 10) codeScore -= 3; // Likely prose, not code
  
  // Threshold: if score >= 4, it's code
  if (codeScore >= 4 && lines.length > 1) {
    return { type: 'code' };
  }

  return { type: 'text' };
}

export const usePasteHandler = (
  setBlocks: React.Dispatch<React.SetStateAction<BlockData[]>>,
  mousePositionRef: RefObject<{ x: number, y: number }>
) => {
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // If we are editing a text block (textarea focused), let the editor handle it
      const target = e.target as HTMLElement;
      const active = document.activeElement as HTMLElement;
      
      // Check if target or active element is an input/textarea/contentEditable
      if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' ||
          active?.isContentEditable || active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT' ||
          target.closest('.ProseMirror') || active?.closest('.ProseMirror')) {
          return;
      }

      // Get paste position from mouse cursor (or default to 200,200)
      const pasteX = mousePositionRef.current?.x ?? 200;
      const pasteY = mousePositionRef.current?.y ?? 200;
      
      // 1. Handle Images
      const items = e.clipboardData?.items;
      if (items) {
          for (const item of items) {
              if (item.type.indexOf('image') !== -1) {
                  const file = item.getAsFile();
                  if (file) {
                      e.preventDefault();
                      const imageId = uuidv4();
                      await imageStorage.storeImage(imageId, file);
                      const objectURL = imageStorage.createObjectURL(file);
                      
                      const newBlock: BlockData = {
                          blockId: uuidv4(),
                          type: 'image',
                          content: '',
                          url: objectURL,
                          imageId: imageId,
                          isUploaded: false,
                          x: pasteX, 
                          y: pasteY,
                          width: 300,
                          height: 'auto'
                      };
                      setBlocks(prev => [...prev, newBlock]);
                      return;
                  }
              }
          }
      }

      // 2. Handle Text/URLs/Code — Smart Auto-Detection
      const text = e.clipboardData?.getData('text/plain');
      if (text) {
           const detected = detectContentType(text);

           if (detected.type === 'embed') {
                e.preventDefault();
                const newBlock: BlockData = {
                      blockId: uuidv4(),
                      type: 'embed',
                      content: text.trim(),
                      x: pasteX,
                      y: pasteY,
                      width: 300,
                      height: 160
                  };
                  setBlocks(prev => [...prev, newBlock]);
           } 
           else if (detected.type === 'code') {
               e.preventDefault();
               const newBlock: BlockData = {
                  blockId: uuidv4(),
                  type: 'code',
                  content: text,
                  x: pasteX,
                  y: pasteY,
                  width: 450,
                  height: 300
              };
              setBlocks(prev => [...prev, newBlock]);
           }
           // Text: only create new block if no element is focused (canvas background)
           else if (document.activeElement === document.body || 
                    document.activeElement?.id === 'smart-canvas-viewport' ||
                    document.activeElement?.closest('#smart-canvas-viewport') ||
                    document.activeElement?.id === 'slide-canvas-viewport' ||
                    document.activeElement?.closest('#slide-canvas-viewport')) {
               e.preventDefault();
               const newBlock: BlockData = {
                  blockId: uuidv4(),
                  type: 'text',
                  content: `<p>${text.replace(/\n/g, '<br>')}</p>`, 
                  x: pasteX, 
                  y: pasteY,
                  width: 300,
                  height: 'auto'
              };
              setBlocks(prev => [...prev, newBlock]);
           }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [setBlocks]);
};