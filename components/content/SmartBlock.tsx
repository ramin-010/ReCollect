'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X, Palette, MoreHorizontal } from 'lucide-react';
import { EmbedBlock } from './EmbedBlock';
import { CodeBlock } from './CodeBlock';
import { BlockEditor } from './BlockEditor';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-base/Button';

interface SmartBlockProps {
  id: string;
  type?: 'text' | 'image' | 'embed' | 'code' | 'stack';
  content: string;
  url?: string; // For images
  stackItems?: any[]; // Recursive type simplified
  width: number;
  height: number | 'auto';
  x: number;
  y: number;
  isSelected?: boolean;
  onUpdate: (content: string) => void;
  onDelete?: () => void;
  onFocus?: () => void;
  onUnstack?: () => void;
  onStackUpdate?: (items: any[]) => void;
  readOnly?: boolean;
}

function SmartBlockComponent({
  id,
  type = 'text',
  content,
  url,
  stackItems,
  width,
  height,
  x,
  y,
  isSelected,
  onUpdate,
  onDelete,
  onFocus,
  onUnstack,
  onStackUpdate,
  readOnly
}: SmartBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Using 60% opacity as requested for glass effect
  const [bgColor, setBgColor] = useState('bg-[hsl(var(--card-bg))]/40'); 
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Calculate progress if tasks exist
  const taskStats = useMemo(() => {
     if (!content) return null;
     const total = (content.match(/data-type="taskItem"/g) || []).length;
     if (total === 0) return null;
     const checked = (content.match(/data-checked="true"/g) || []).length;
     return { total, checked, progress: Math.round((checked / total) * 100) };
  }, [content]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative rounded-xl border transition-all  duration-200 group flex flex-col",
        "backdrop-blur-md shadow-sm hover:shadow-md",
        isSelected ? "border-[hsl(var(--brand-primary))] ring-1 ring-[hsl(var(--brand-primary))]/20" : "border-[hsl(var(--border))]/50",
        bgColor
      )}
      style={{
        width: width,
        height: height,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        // e.stopPropagation();
        onFocus?.();
        setIsEditing(true);
      }}
    >
      {/* Drag Handle - Only visible on hover */}
      <div className={cn(
        "smart-block-drag-handle",
        "absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-lg z-[100] cursor-grab active:cursor-grabbing transition-opacity",
        isHovered || isSelected ? "opacity-100" : "opacity-0"
      )}
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* Controls Overlay - Top Right */}
      <div className={cn(
        "absolute -top-2 -right-2 flex items-center gap-1 transition-opacity z-[100]",
        isHovered ? "opacity-100" : "opacity-0"
      )}>
         <button 
           onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
           className="p-1 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
         >
            <X className="w-3 h-3" />
         </button>
      </div>

      {/* Content Area */}
      <div className={cn("flex-1 overflow-hidden relative z-10", type === 'text' ? 'p-4' : 'p-0')}>
        {type === 'text' && (
             isEditing ? (
                <BlockEditor 
                    content={content} 
                    onChange={onUpdate}
                    autoFocus={true}
                    onBlur={() => setIsEditing(false)}
                />
            ) : (
                <div 
                    className="prose prose-sm dark:prose-invert max-w-none leading-normal text-[hsl(var(--foreground))] select-none pointer-events-none [&>ul]:list-disc [&>ol]:list-decimal [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold"
                    dangerouslySetInnerHTML={{ __html: content || '<span class="opacity-50 italic">Empty note...</span>' }}
                />
            )
        )}

        {type === 'image' && (
            <img 
               src={url || content} 
               alt="Note attachment"
               className="w-full h-full object-cover pointer-events-none select-none"
               draggable="false"
            />
        )}

        {type === 'embed' && (
             <div className="w-full h-full pointer-events-auto">
                 <EmbedBlock url={content} />
             </div>
        )}

        {type === 'code' && (
             <div className="w-full h-full">
                 <CodeBlock code={content} />
             </div>
        )}

        {/* Task Progress Bar */}
        {type === 'text' && taskStats && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[hsl(var(--muted))]/30">
                <div 
                    className="h-full bg-green-500/50 transition-all duration-500 ease-out"
                    style={{ width: `${taskStats.progress}%` }}
                />
            </div>
        )}

        {type === 'stack' && stackItems && stackItems.length > 0 && (
             <div className="w-full h-full flex flex-col bg-[hsl(var(--muted))]/10">
                 {/* Stack Header */}
                 <div className="px-3 py-2 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))]/50 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand-primary))]" />
                         <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                            Stack ({stackItems.length})
                         </span>
                     </div>
                 </div>

                 {/* Vertical Stream of Items */}
                {/* Vertical Stream of Items */}
                 <div 
                    className="flex-1 overflow-y-auto overflow-x-hidden p-2  space-y-2 relative"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Stop bubbling to canvas
                        
                        const targetIndex = dropTargetIndex;
                        setDropTargetIndex(null); // Clear visual indicator

                        const stackData = e.dataTransfer.getData('application/recollect-stack-item');
                        if (stackData && targetIndex !== null && onStackUpdate) {
                            try {
                                const { stackId, itemIndex } = JSON.parse(stackData);
                                // Only reorder if dragging within the SAME stack
                                if (stackId === id) {
                                    const newItems = [...stackItems];
                                    const [movedItem] = newItems.splice(itemIndex, 1);
                                    
                                    // Adjust target index if we are moving downwards
                                    // If we remove item at 0, and target is 2. 
                                    // Array shifts. Insertion at 2 in OLD array means index 2 in NEW array?
                                    // No, dropTargetIndex is based on render index.
                                    // If we remove item BEFORE target, we need to decr target.
                                    let finalIndex = targetIndex;
                                    if (itemIndex < targetIndex) {
                                        finalIndex--;
                                    }
                                    
                                    newItems.splice(finalIndex, 0, movedItem);
                                    onStackUpdate(newItems);
                                }
                            } catch (err) {
                                console.error("Container drop failed", err);
                            }
                        }
                    }}
                 >
                     {stackItems.map((item, index) => (
                         <React.Fragment key={index}>
                             {/* Render Drop Placeholder Line/Gap if this is the target */}
                             {dropTargetIndex === index && (
                                 <div className="h-16 rounded-lg border-2 border-dashed border-[hsl(var(--brand-primary))]/50 bg-[hsl(var(--brand-primary))]/5 flex items-center justify-center transition-all duration-200">
                                     <span className="text-[10px] text-[hsl(var(--brand-primary))] font-medium">Drop here</span>
                                 </div>
                             )}

                             <div 
                                draggable
                                onDragStart={(e) => {
                                    e.stopPropagation();
                                    const data = {
                                        stackId: id,
                                        itemIndex: index,
                                        itemData: item
                                    };
                                    e.dataTransfer.setData('application/recollect-stack-item', JSON.stringify(data));
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnter={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Only show placeholder if not dragging self?
                                    // For simplicity, just set index. Ideally checking source index would be better but we rely on data transfer
                                    setDropTargetIndex(index);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault(); 
                                    e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDropTargetIndex(null);
                                    
                                    const stackData = e.dataTransfer.getData('application/recollect-stack-item');
                                    if (stackData) {
                                        try {
                                            const { stackId, itemIndex } = JSON.parse(stackData);
                                            // Only reorder if dragging within the SAME stack
                                            if (stackId === id && onStackUpdate) {
                                                const newItems = [...stackItems];
                                                const [movedItem] = newItems.splice(itemIndex, 1);
                                                // Adjust visual index since removing item might shift indices
                                                // If moving down (itemIndex < index), we effectively insert at index-1 after removal?
                                                // DnD index logic can be tricky.
                                                // Simple swap: Insert before current map index
                                                // The dropTargetIndex logic implies "Before Item X". 
                                                // Let's stick to valid array splicing:
                                                
                                                // Calculate destination
                                                let destIndex = index;
                                                // If we drag item 0 to item 2 (drop on 2). 
                                                // Remove 0. New array length N-1. 
                                                // Insert at 2? (Which is now index 1 in new array).
                                                
                                                // To keep it simple: We just use the target index from the map.
                                                // If target > source, we might need to decrement destination if we removed before it?
                                                // Actually, standard splice logic:
                                                if (itemIndex < destIndex) {
                                                   destIndex -= 0; // It was before, so effectively we shift it down? No.
                                                   // 0, 1, 2. Drag 0 to 2.
                                                   // Remove 0 -> [1, 2].
                                                   // Insert at 2? -> [1, 2, 0]. Correct.
                                                   
                                                   // 0, 1, 2. Drag 2 to 0.
                                                   // Remove 2 -> [0, 1].
                                                   // Insert at 0 -> [2, 0, 1]. Correct.
                                                   
                                                   // But wait, if I drop ON index 2, do I want it BEFORE or AFTER 2?
                                                   // Usually placeholders imply "Insert Before".
                                                   // If I drag 0 to 0. No op.
                                                }
                                                
                                                // Correction for "Insert Before" logic when element is removed from array
                                                if (itemIndex < index) { 
                                                    // dragging downwards
                                                    destIndex--; 
                                                }

                                                newItems.splice(index, 0, movedItem); 
                                                // Wait, if I splice at 'index', I am inserting BEFORE the current 'item'.
                                                // If I removed something *before* current 'item', 'item' has shifted index in the new array?
                                                // No, 'index' is from the *render map* which corresponds to the OLD array.
                                                // But 'newItems' has already been spliced.
                                                // So I need to map 'index' to 'newItems' index.
                                                
                                                // Let's refine:
                                                // Source array: [A, B, C, D]
                                                // Move A(0) to C(2). Target is C.
                                                // 1. Remove A. Arr=[B, C, D].
                                                // 2. We want A before C? -> [B, A, C, D].
                                                // C was at 2. In new array C is at 1.
                                                // So if itemIndex < index, we insert at index - 1.
                                                
                                                // Move C(2) to A(0). Target is A.
                                                // 1. Remove C. Arr=[A, B, D].
                                                // 2. Insert at 0. -> [C, A, B, D].
                                                // A was at 0. In new array A is at 0.
                                                // So if itemIndex > index, we insert at index.
                                                
                                                const finalNewItems = [...stackItems];
                                                const [moved] = finalNewItems.splice(itemIndex, 1);
                                                // Adjust insertion index
                                                // If we are dropping *on* index, we invoke insert *before* index.
                                                // But if we removed something *before* index, 'index' in original array is now 'index-1' in spliced array.
                                                let insertAt = index;
                                                if (itemIndex < index) {
                                                    insertAt = index - 1; 
                                                    // But wait, if I drop ON the exact same item... insertAt = index-1? 
                                                    // Drag 1 to 2. Remove 1. Insert at 2-1=1? No change.
                                                    // Actually if I drag 1 over 2, I want 1,2 -> 2,1?
                                                    // The placeholder shows *Above* 2.
                                                    // So [0, 1, 2]. Drag 1 over 2. Visual: [0, 1, <Gap>, 2]. Drop.
                                                    // Result: [0, 1, 2] -> [0, 2] -> [0, 1, 2].
                                                    // If I want to swap, I should probably render gap *after* if dragging down?
                                                    // Or simpler: Just reorder based on "Insert Before".
                                                    // If I want to move 1 after 2, I need to drop on 3 (if exists) or have a "bottom" drop zone.
                                                    // For now "Insert Before" is standard. To move to bottom, you drag to last item.
                                                }
                                                finalNewItems.splice(insertAt, 0, moved);
                                                onStackUpdate(finalNewItems);
                                            }
                                        } catch (err) {
                                            console.error("Reorder failed", err);
                                        }
                                    }
                                }}
                                className="bg-[hsl(var(--card))] border border-[hsl(var(--border))]/50 rounded-lg p-3 shadow-sm relative group/item hover:border-[hsl(var(--brand-primary))]/30 transition-colors cursor-grab active:cursor-grabbing"
                             >
                                {/* Stack Index Number - Top Left Outside */}
                                <div className="absolute top-0 right-1 text-[8px] font-mono font-medium text-[hsl(var(--muted-foreground))] opacity-50 select-none pointer-events-none">
                                    {index < 9 ? `0${index + 1}` : index + 1}
                                </div>

                                 {item.type === 'text' && (
                                    <div className="prose prose-sm dark:prose-invert line-clamp-[8] text-sm" dangerouslySetInnerHTML={{ __html: item.content }} />
                                 )}
                                 {item.type === 'image' && (
                                    <div className="rounded-md overflow-hidden w-full mt-1">
                                        <img src={item.url || item.content} className="w-full h-auto object-contain" />
                                    </div>
                                 )}
                                 {item.type === 'embed' && (
                                     <div className="rounded-md overflow-hidden mt-2 pointer-events-none">
                                         <EmbedBlock url={item.content} />
                                     </div>
                                 )}
                                 {item.type === 'code' && (
                                     <div className="rounded-md overflow-hidden mt-2 pointer-events-none max-h-32">
                                         <CodeBlock code={item.content} />
                                     </div>
                                 )}
                             </div>
                         </React.Fragment>
                     ))}
                     {/* Bottom Drop Zone to allow appending to end */}
                     <div 
                        className="h-8 w-full transparent transition-all"
                        onDragEnter={() => setDropTargetIndex(stackItems.length)}
                     >
                         {dropTargetIndex === stackItems.length && (
                             <div className="h-16 rounded-lg border-2 border-dashed border-[hsl(var(--brand-primary))]/50 bg-[hsl(var(--brand-primary))]/5 flex items-center justify-center">
                                 <span className="text-[10px] text-[hsl(var(--brand-primary))] font-medium">Drop at end</span>
                             </div>
                         )}
                     </div>
                 </div>
             </div>
        )}
      </div>
      
    </motion.div>
  );
}

export const SmartBlock = React.memo(SmartBlockComponent);
