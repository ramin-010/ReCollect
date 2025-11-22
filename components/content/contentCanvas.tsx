'use client';

import { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Type, Image as ImageIcon, Save, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui-base/Button';
// #change1: Import imageStorage for IndexedDB operations
import { imageStorage } from '@/lib/storage/imageStorage';
import { isEqual } from 'lodash';


// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface Block {
  blockId: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  url?: string;
  fontSize?: number;
  // #change2: Add imageId to track IndexedDB reference
  imageId?: string;      // IndexedDB reference for images
  isUploaded?: boolean;  // Track if image is uploaded to cloud
}

interface ContentCanvasProps {
  initialBlocks?: Block[];
  onSave?: (blocks: Block[]) => void;
  readOnly?: boolean;
}

// ============================================================
// EDITABLE TEXT BLOCK COMPONENT
// ============================================================
type EditableTextBlock = {
  content: string;
  onChange: (newContent: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  readOnly?: boolean;
  onSizeChange?: (w: number, h: number) => void;
  onPasteImage?: (file: File) => void; // #change3: Changed from (url: string) to (file: File)
  autoFocus?: boolean;
  isEditing?: boolean;
  textSize : number
}


function EditableTextBlock({
  content,
  onChange,
  onFocus,
  onBlur,
  readOnly,
  onSizeChange,
  onPasteImage,
  autoFocus,
  isEditing,
  textSize
}: EditableTextBlock ) {
  const divRef = useRef<HTMLDivElement>(null);
  const measureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync content with div innerHTML
  useEffect(() => {
    if (divRef.current && divRef.current.innerHTML !== content) {
      divRef.current.innerHTML = content;
    }
    measure();
  }, [content]);

  // Handle autofocus and cursor positioning
  useEffect(() => {
    if (autoFocus && divRef.current) {
      const el = divRef.current;
      el.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {}
      measure();
    }
  }, [autoFocus]);

  // Measure both WIDTH and HEIGHT dynamically
  const measure = () => {
    const el = divRef.current;
    if (!el) return;
    
    const height = Math.ceil(el.scrollHeight);
    const width = Math.ceil(el.scrollWidth);
    
    onSizeChange?.(Math.max(100, width + 20), Math.max(30, height));
  };

  // Debounced measurement on input
  const handleInput = () => {
    onChange(divRef.current?.innerHTML || '');
    
    if (measureTimeoutRef.current) {
      clearTimeout(measureTimeoutRef.current);
    }
    
    measureTimeoutRef.current = setTimeout(() => {
      measure();
    }, 120);
  };


  const calcMaxWidth = () =>{

  }
  // Handle image paste
  // #change4: Updated to pass File directly instead of converting to base64
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          // OLD CODE (commented):
          // const reader = new FileReader();
          // reader.onload = (event) => {
          //   const url = event.target?.result as string;
          //   onPasteImage?.(url);
          // };
          // reader.readAsDataURL(file);
          
          // NEW CODE: Pass File directly
          onPasteImage?.(file);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
    
    if (measureTimeoutRef.current) {
      clearTimeout(measureTimeoutRef.current);
    }
    measureTimeoutRef.current = setTimeout(measure, 120);
  };

  return (
    <div
      ref={divRef}
      contentEditable={!readOnly && !!isEditing}
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      onFocus={onFocus}
      onBlur={onBlur}
      className={`text-editor block text-[hsl(var(--foreground))]  leading-relaxed outline-none bg-transparent ${
        readOnly ? 'cursor-default' : ''
      }`}
      style={{
fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        display: 'inline-block',
        minWidth: '100px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        minHeight: '1.4em',
        caretColor: 'white',
        padding: '4px 8px',
        fontSize: `${textSize}px`,
        fontWeight : '500'
      }}
    />
  );
}

// ============================================================
// MAIN CONTENT CANVAS COMPONENT
// ============================================================

export function ContentCanvas({
  initialBlocks = [],
  onSave,
  readOnly = false,
}: ContentCanvasProps) {

  const [textSize, setTextSize] = useState<number>(17);
 
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
 // const prevBlocks = usePrevious(blocks);
    const lastBlocksRef = useRef<Block[]>(blocks);
  // ============================================================
  // REFS
  // ============================================================
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 150, y: 150 });
  
  // ============================================================
  // EFFECTS
  // ============================================================
  
  // #change5: Load images from IndexedDB on mount
  useEffect(() => {
    const loadImages = async () => {
      const loadedBlocks = await Promise.all(
        initialBlocks.map(async (block) => {
          if (block.type === 'image' && block.imageId && !block.isUploaded) {
            // Load from IndexedDB
            const blob = await imageStorage.getImage(block.imageId);
            if (blob) {
              return {
                ...block,
                url: imageStorage.createObjectURL(blob)
              };
            }
          }
          return block;
        })
      );
      setBlocks(loadedBlocks);
    };
    
    loadImages();
    
    // Cleanup object URLs on unmount
    return () => {
      blocks.forEach(block => {
        if (block.type === 'image' && block.url?.startsWith('blob:')) {
          imageStorage.revokeObjectURL(block.url);
        }
      });
    };
  }, [initialBlocks]);

  // ============================================================
  // BLOCK MANAGEMENT FUNCTIONS
  // ============================================================

  const addTextBlock = (x?: number, y?: number) => {
    const newBlock: Block = {
      blockId: uuidv4(),
      type: 'text',
      x: x ?? 100,
      y: y ?? 100,
      width: 300,
      height: 30,
      content: '',
      fontSize : 17
    };
    setBlocks((prev) => [...prev, newBlock]);
    setEditingBlock(newBlock.blockId);
   // setSelectedId(newBlock.id)
  };

const handleContentResize = (blockId: string, width: number, height: number) => {
  setBlocks((prev) =>
    prev.map((block) => {
      if (block.blockId !== blockId) return block;

      // Approximate text padding
      const paddingX = 20; // 10px left + 10px right
      const paddingY = 8;  // 4px top + 4px bottom

      const usableWidth = width - paddingX;
      const usableHeight = height - paddingY;

      // Estimate font size: height is usually more limiting
      const fontSizeByHeight = Math.floor(usableHeight * 0.6); // 60% of height
      const fontSizeByWidth = Math.floor(usableWidth / Math.max((block.content?.length || 1) * 0.5, 1)); 
      // width factor assumes average char width ~0.5em

      const newFontSize = Math.max(12, Math.min(fontSizeByHeight, fontSizeByWidth));

      return { ...block, fontSize: newFontSize };
    })
  );
};

  // #change6: Updated addImageBlock to use IndexedDB
  const addImageBlock = async (file: File | Blob, x?: number, y?: number) => {
    const imageId = uuidv4();
    
    try {
      await imageStorage.storeImage(imageId, file);
      
      // Create temporary object URL for display
      const objectURL = imageStorage.createObjectURL(file);
      
      const newBlock: Block = {
        blockId: uuidv4(),
        type: 'image',
        x: x ?? 150,
        y: y ?? 150,
        width: 300,
        height: 200,
        url: objectURL,        // Temporary URL for display
        imageId: imageId,      // Reference to IndexedDB
        isUploaded: false,     // Not yet uploaded to cloud
      };
      
      setSelectedId(newBlock.blockId);
      setBlocks((prev) => [...prev, newBlock]);
    } catch (error) {
      console.error('Failed to store image:', error);
    }
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((block) => (block.blockId === id ? { ...block, ...updates } : block))
    );
  };

  const deleteBlock = (id: string) => {
    // #change7: Cleanup IndexedDB and object URLs when deleting
    const block = blocks.find(b => b.blockId === id);
    if (block?.type === 'image') {
      if (block.imageId) {
        imageStorage.deleteImage(block.imageId).catch(console.error);
      }
      if (block.url?.startsWith('blob:')) {
        imageStorage.revokeObjectURL(block.url);
      }
    }
    
    setBlocks((prev) => prev.filter((block) => block.blockId !== id));
  };

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-inner')) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0);
      const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);
      addTextBlock(x, y);
    }
  };



  const handleSave = () => {
    onSave?.(blocks);
  };


    useEffect(() => {
      const timer = setTimeout(() => {
        // Only save if blocks have actually changed
        if (!isEqual(lastBlocksRef.current, blocks)) {
          handleSave();
          lastBlocksRef.current = blocks;
        }
      }, 1000);

      return () => clearTimeout(timer);
    }, [blocks]);

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all blocks?')) {
      // #change8: Cleanup all image data before clearing
      blocks.forEach(block => {
        if (block.type === 'image') {
          if (block.imageId) {
            imageStorage.deleteImage(block.imageId).catch(console.error);
          }
          if (block.url?.startsWith('blob:')) {
            imageStorage.revokeObjectURL(block.url);
          }
        }
      });
      
      setBlocks([]);
    }
  };

  // #change9: Updated handleImageUpload to pass File directly
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("this is url : image upload hit")
    
    if (file) {
      // OLD CODE (commented):
      // const reader = new FileReader();
      // reader.onload = (event) => {
      //   const url = event.target?.result as string;
      //   addImageBlock(url);
      //   console.log("this is url : ", url)
      // };
      // reader.readAsDataURL(file);
      
      // NEW CODE: Pass File directly
      addImageBlock(file);
    }
  };

  // #change10: Updated handlePaste to pass File directly
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          // OLD CODE (commented):
          // const reader = new FileReader();
          // reader.onload = (ev) => {
          //   const url = ev.target?.result as string;
          //   const pos = lastMousePosRef.current;
          //   const nb: Block = {
          //     id: uuidv4(),
          //     type: 'image',
          //     x: pos.x,
          //     y: pos.y,
          //     width: 300,
          //     height: 200,
          //     url,
          //   };
          //   console.log("url",nb.url)
          //   setBlocks((prev) => [...prev, nb]);
          // };
          // reader.readAsDataURL(file);
          
          // NEW CODE: Pass File directly
          const pos = lastMousePosRef.current;
          addImageBlock(file, pos.x, pos.y);
          
          e.preventDefault();
          e.stopPropagation();
          break;
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    lastMousePosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('hit')
    
    if (canvasRef.current) canvasRef.current.focus();
 if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-inner')) {      setSelectedId(null);
      
      };
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && !editingBlock && selectedId) {
      e.preventDefault();
      // #change11: Use deleteBlock to cleanup properly
      deleteBlock(selectedId);
      setSelectedId(null);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      onSave?.(blocks);
    } else if (e.key === 'Escape') {
      setSelectedId(null);
    }
  };

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  const calculateMinHeight = () => {
    if (blocks.length === 0) return '100%';
    const maxY = Math.max(...blocks.map(b => b.y + b.height));
    return Math.max(400, maxY + 100) + 'px'; //#
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Toolbar - Currently commented out */}
      {/* {!readOnly && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#1a1a1a]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addTextBlock()}
            className="text-gray-300 hover:text-white hover:bg-white/5"
          >
            <Type className="w-4 h-4 mr-2" />
            Add Text
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-300 hover:text-white hover:bg-white/5"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Add Image
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="text-gray-300 hover:text-white hover:bg-white/5"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-gray-300 hover:text-white hover:bg-white/5"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      )} */}

      {/* Hidden file input for image upload */}
      {/* <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      /> */}

      {/* Main Canvas Area */}
      <div
        ref={canvasRef}
        onPaste={handlePaste}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="flex-1 relative bg-[#2a2a2a] overflow-auto"
        style={{ width: '100%' }}
      >
        <div 
          className="relative canvas-inner"
          onDoubleClick={handleCanvasDoubleClick}
          style={{ 
            minHeight: calculateMinHeight(),
            width: '100%'
          }}
        >
          {/* Empty state message */}
          {blocks.length === 0 && !readOnly && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
              Double-click to add text or paste an image (Ctrl/Cmd + V)
            </div>
          )}

          {/* Render all blocks */}
          {blocks.map((block) => (
            <Rnd
              key={block.blockId}
              position={{ x: block.x, y: block.y }}
              size={{ width: block.width, height: block.height }}
              cancel={editingBlock === block.blockId ? ".text-editor" : undefined}
              onDragStop={(e, d) => updateBlock(block.blockId, { x: d.x, y: d.y })}
              onDragStart={() => setSelectedId(block.blockId)}
              onResizeStop={(e, direction, ref, delta, position) =>{
                updateBlock(block.blockId, {
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                  ...position,
                })
                handleContentResize(block.blockId, parseInt(ref.style.width), parseInt(ref.style.height));

              }}
              onResize={(e, direction, ref, delta, position) => {
                const newWidth = parseInt(ref.style.width);
                const newHeight = parseInt(ref.style.height);

                console.log("hit event")
                // Update block dimensions
                updateBlock(block.blockId, { width: newWidth, height: newHeight, ...position });

                // Call your custom function
                handleContentResize(block.blockId, newWidth, newHeight);
              }}
              minWidth={block.type === 'text' ? 100 : 50}
              minHeight={block.type === 'text' ? 30 : 50}
              bounds="parent"
              enableResizing={!readOnly}
              disableDragging={readOnly}
              className={`group ${selectedId === block.blockId ? 'ring-1 ring-[hsl(var(--foreground))] rounded-md' : ''}`}
            >
              <div
                className={`relative ${block.type === 'image' ? 'w-full h-full' : ''}`}
                onMouseEnter={() => setHoveredBlock(block.blockId)}
                onMouseLeave={() => setHoveredBlock(null)}
                onMouseDown={() => { 
                  setSelectedId(block.blockId); 
                  if (canvasRef.current) canvasRef.current.focus(); 
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingBlock(block.blockId);
                }}
              >
                {block.type === 'text' ? (
                  <EditableTextBlock
                    key={block.blockId}
                    content={block.content || ''}
                    readOnly={readOnly}
                    autoFocus={editingBlock === block.blockId}
                    isEditing={editingBlock === block.blockId}
                    onChange={(newContent) =>
                      updateBlock(block.blockId, { content: newContent })
                    }
                    onSizeChange={(w, h) =>
                      updateBlock(block.blockId, { width: Math.max(100, w), height: Math.max(30, h) })
                    }
                    onPasteImage={(file) =>
                      addImageBlock(file, (block.x || 0) + (block.width || 0) + 16, block.y || 0)
                    }
                    onFocus={() => setEditingBlock(block.blockId)}
                    onBlur={() => setEditingBlock(null)}
                    textSize={block.fontSize || 17}
                  />
                ) : (
                  <img
                    src={block.url}
                    alt="Canvas content"
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                    draggable={false}
                  />
                )}
              </div>
            </Rnd>
          ))}
        </div>
      </div>
    </div>
  );
}