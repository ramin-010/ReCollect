'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Type, Image as ImageIcon, Save, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui-base/Button';
import { imageStorage } from '@/lib/storage/imageStorage';
import { isEqual } from 'lodash';



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
  imageId?: string;        isUploaded?: boolean;    autoWidth?: boolean;   }

interface ContentCanvasProps {
  initialBlocks?: Block[];
  onSave?: (blocks: Block[]) => void;
  readOnly?: boolean;
}


type EditableTextBlock = {
  content: string;
  onChange: (newContent: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  readOnly?: boolean;
  onDimensionsChange?: (w: number, h: number) => void;   onPasteImage?: (file: File) => void;
  autoFocus?: boolean;
  isEditing?: boolean;
  textSize: number;
  width: number;
  autoWidth?: boolean; }


function EditableTextBlock({
  content,
  onChange,
  onFocus,
  onBlur,
  readOnly,
  onDimensionsChange,
  onPasteImage,
  autoFocus,
  isEditing,
  textSize,
  width,
  autoWidth
}: EditableTextBlock) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);   const isMountedRef = useRef(false); 
    useLayoutEffect(() => {
    const el = textareaRef.current;
    const ghost = ghostRef.current;
    if (!el || !ghost) return;

        let newWidth = width;
    if (autoWidth) {
      ghost.textContent = content || ' ';       
      const measuredWidth = ghost.scrollWidth;
            newWidth = Math.max(width, measuredWidth + 10); 
    }

        el.style.height = 'auto';
    const newHeight = el.scrollHeight;
    el.style.height = `${newHeight}px`;

        if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

        const widthChanged = autoWidth && Math.abs(newWidth - width) > 1;
        
    if (widthChanged) {
      onDimensionsChange?.(newWidth, newHeight);
    }

  }, [content, textSize, autoWidth]); 
    useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [autoFocus]);


  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          onPasteImage?.(file);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
  };

  const commonStyles: React.CSSProperties = {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: `${textSize}px`,
    fontWeight: '500',
    lineHeight: '1.1',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    padding: '0px',
  };

  return (
    <>
      {/* #change: Ghost element for measuring width */}
      <div
        ref={ghostRef}
        style={{
          ...commonStyles,
          position: 'absolute',
          top: 0,
          left: 0,
          visibility: 'hidden',
          height: 'auto',
          width: 'auto',           minWidth: '10px',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
      
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        onFocus={onFocus}
        onBlur={onBlur}
        readOnly={readOnly}
        className={`text-editor block text-[hsl(var(--foreground))] leading-relaxed outline-none bg-transparent ${readOnly ? 'cursor-default' : ''
          }`}
        style={{
          ...commonStyles,
          display: 'block',
          width: '100%',
          resize: 'none',
          overflow: 'hidden',
          minHeight: '10px',
          caretColor: 'white',
          border: 'none',
                    pointerEvents: isEditing ? 'auto' : 'none',
        }}
      />
    </>
  );
}


export function ContentCanvas({
  initialBlocks = [],
  onSave,
  readOnly = false,
}: ContentCanvasProps) {

  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
    const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [initialResizeState, setInitialResizeState] = useState<{ width: number, height: number, fontSize: number } | null>(null);


  const lastBlocksRef = useRef<Block[]>(blocks);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 150, y: 150 });

      
  useEffect(() => {
    const loadImages = async () => {
      const loadedBlocks = await Promise.all(
        initialBlocks.map(async (block) => {
          if (block.type === 'image' && block.imageId && !block.isUploaded) {
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

    return () => {
      blocks.forEach(block => {
        if (block.type === 'image' && block.url?.startsWith('blob:')) {
          imageStorage.revokeObjectURL(block.url);
        }
      });
    };
  }, [initialBlocks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isEqual(lastBlocksRef.current, blocks)) {
        onSave?.(blocks);
        lastBlocksRef.current = blocks;
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [blocks, onSave]);

      
  const addTextBlock = (x?: number, y?: number) => {
    const newBlock: Block = {
      blockId: uuidv4(),
      type: 'text',
      x: x ?? 100,
      y: y ?? 100,
      width: 10,       height: 30,
      content: '',
      fontSize: 20,
      autoWidth: true     };
    setBlocks((prev) => [...prev, newBlock]);
    setEditingBlock(newBlock.blockId);
  };

  const addImageBlock = async (file: File | Blob, x?: number, y?: number) => {
    const imageId = uuidv4();
    try {
      await imageStorage.storeImage(imageId, file);
      const objectURL = imageStorage.createObjectURL(file);
      const newBlock: Block = {
        blockId: uuidv4(),
        type: 'image',
        x: x ?? 150,
        y: y ?? 150,
        width: 300,
        height: 200,
        url: objectURL,
        imageId: imageId,
        isUploaded: false,
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
    const block = blocks.find(b => b.blockId === id);
    if (block?.type === 'image') {
      if (block.imageId) imageStorage.deleteImage(block.imageId).catch(console.error);
      if (block.url?.startsWith('blob:')) imageStorage.revokeObjectURL(block.url);
    }
    setBlocks((prev) => prev.filter((block) => block.blockId !== id));
  };

      
  const handleResizeStart = (block: Block, direction: string) => {
    setResizingBlockId(block.blockId);
    setResizeDirection(direction);
    setInitialResizeState({
      width: block.width,
      height: block.height,
      fontSize: block.fontSize || 20
    });
  };

  const handleResize = (blockId: string, ref: HTMLElement, direction: string, position: { x: number, y: number }) => {
    const newWidth = parseInt(ref.style.width);
    const newHeight = parseInt(ref.style.height);
    
        const block = blocks.find(b => b.blockId === blockId);
    if (!block || !initialResizeState) return;

    if (block.type === 'text') {
            const isScaling = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'top', 'bottom'].includes(direction);
      
      if (isScaling) {
                                
                                
        const scaleFactor = newWidth / initialResizeState.width;
        const newFontSize = Math.max(1, initialResizeState.fontSize * scaleFactor);
        
        updateBlock(blockId, {
          width: newWidth,
          height: newHeight,
          fontSize: newFontSize,
          ...position,
                    autoWidth: true 
        });
      } else {
                updateBlock(blockId, {
          width: newWidth,
          ...position,
                    autoWidth: true 
        });
      }
    } else {
            updateBlock(blockId, {
        width: newWidth,
        height: newHeight,
        ...position
      });
    }
  };

  const handleResizeStop = () => {
    setResizingBlockId(null);
    setResizeDirection(null);
    setInitialResizeState(null);
  };

      
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

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
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
    if (canvasRef.current) canvasRef.current.focus();
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-inner')) {
      setSelectedId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && !editingBlock && selectedId) {
      e.preventDefault();
      deleteBlock(selectedId);
      setSelectedId(null);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      onSave?.(blocks);
    } else if (e.key === 'Escape') {
      setSelectedId(null);
    }
  };

  const calculateMinHeight = () => {
    if (blocks.length === 0) return '100%';
    const maxY = Math.max(...blocks.map(b => b.y + b.height));
    return Math.max(400, maxY + 100) + 'px';
  };

  const calculateMinWidth = () => {
    if (blocks.length === 0) return '100%';
    const maxX = Math.max(...blocks.map(b => b.x + b.width));
    return `max(100%, ${maxX + 100}px)`;
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
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
            minWidth: calculateMinWidth(),
            width: 'fit-content'
          }}
        >
          {blocks.length === 0 && !readOnly && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
              Double-click to add text or paste an image (Ctrl/Cmd + V)
            </div>
          )}

          {blocks.map((block) => (
            <Rnd
              key={block.blockId}
              position={{ x: block.x, y: block.y }}
              size={{ width: block.width, height: block.height }}
              cancel={editingBlock === block.blockId ? ".text-editor" : undefined}
              onDragStop={(e, d) => updateBlock(block.blockId, { x: d.x, y: d.y })}
              onDragStart={() => setSelectedId(block.blockId)}
              
              onResizeStart={(e, direction, ref) => {
                handleResizeStart(block, direction);
              }}
              onResize={(e, direction, ref, delta, position) => {
                handleResize(block.blockId, ref, direction, position);
              }}
              onResizeStop={handleResizeStop}
              height={50}
              minWidth={10}
              minHeight={10}
              bounds="parent"
              enableResizing={!readOnly}
                            lockAspectRatio={
                block.type === 'text' && 
                ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'top', 'bottom'].includes(resizeDirection || '')
              }
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
                    onDimensionsChange={(newWidth, newHeight) => {
                       const updates: Partial<Block> = {};
                                              if (Math.abs(newWidth - block.width) > 1) updates.width = newWidth;
                                                                     if (editingBlock === block.blockId && Math.abs(newHeight - block.height) > 1) {
                          updates.height = newHeight;
                       }
                       
                       if (Object.keys(updates).length > 0) {
                          updateBlock(block.blockId, updates);
                       }
                    }}
                    onPasteImage={(file) =>
                      addImageBlock(file, (block.x || 0) + (block.width || 0) + 16, block.y || 0)
                    }
                    onFocus={() => setEditingBlock(block.blockId)}
                    onBlur={() => setEditingBlock(null)}
                    textSize={block.fontSize || 20}
                    width={block.width}
                    autoWidth={block.autoWidth}
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