import { useEffect, RefObject } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { imageStorage } from '@/lib/storage/imageStorage';
import { BlockData } from './types';

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
          // Also check for ProseMirror specifically just in case
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
                          content: '', // URL is used
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

      // 2. Handle Text/URLs
      const text = e.clipboardData?.getData('text/plain');
      if (text) {
           // Check if it's a URL
           const urlPattern = /^(http|https):\/\/[^ "]+$/;
           // Check if it's code (simple heuristic: contains multiple newlines + common keywords or braces)
           const codePattern = /(const|let|var|function|class|import|export|if|for|while|return|=>|{|})/g;
           const isCode = text.split('\n').length > 1 && (text.match(codePattern) || []).length > 3;

           if (urlPattern.test(text.trim())) {
                e.preventDefault();
                const newBlock: BlockData = {
                      blockId: uuidv4(),
                      type: 'embed',
                      content: text.trim(),
                      x: pasteX,
                      y: pasteY,
                      width: 300,
                      height: 200
                  };
                  setBlocks(prev => [...prev, newBlock]);
           } 
           else if (isCode) {
               e.preventDefault();
               const newBlock: BlockData = {
                  blockId: uuidv4(),
                  type: 'code',
                  content: text,
                  x: pasteX,
                  y: pasteY,
                  width: 400, // code blocks usually need more width
                  height: 'auto'
              };
              setBlocks(prev => [...prev, newBlock]);
           }
           // If normal text, let it be unless no block is focused? 
           // Actually, if we are not in an editor, we should create a new text block
           else if (document.activeElement === document.body) {
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