import { TaskStats } from './types';

export const calculateTaskStats = (content: string): TaskStats | null => {
  if (!content) return null;
  const total = (content.match(/data-type="taskItem"/g) || []).length;
  if (total === 0) return null;
  const checked = (content.match(/data-checked="true"/g) || []).length;
  return { total, checked, progress: Math.round((checked / total) * 100) };
};

export const handleStackDrop = (
  e: React.DragEvent,
  dropTargetIndex: number | null,
  stackId: string,
  stackItems: any[],
  onStackUpdate?: (items: any[]) => void
) => {
  e.preventDefault();
  e.stopPropagation();

  const stackData = e.dataTransfer.getData('application/recollect-stack-item');
  if (stackData && dropTargetIndex !== null && onStackUpdate) {
    try {
      const { stackId: sourceStackId, itemIndex } = JSON.parse(stackData);
      // Only reorder if dragging within the SAME stack
      if (sourceStackId === stackId) {
        const newItems = [...stackItems];
        const [movedItem] = newItems.splice(itemIndex, 1);
        
        // Adjust target index if we are moving downwards
        let finalIndex = dropTargetIndex;
        if (itemIndex < dropTargetIndex) {
          finalIndex--;
        }
        
        newItems.splice(finalIndex, 0, movedItem);
        onStackUpdate(newItems);
      }
    } catch (err) {
      console.error("Container drop failed", err);
    }
  }
};

export const handleStackItemDrop = (
  e: React.DragEvent,
  index: number,
  stackId: string,
  stackItems: any[],
  onStackUpdate?: (items: any[]) => void
) => {
  e.preventDefault();
  e.stopPropagation();
  
  const stackData = e.dataTransfer.getData('application/recollect-stack-item');
  if (stackData) {
    try {
      const { stackId: sourceStackId, itemIndex } = JSON.parse(stackData);
      // Only reorder if dragging within the SAME stack
      if (sourceStackId === stackId && onStackUpdate) {
        const finalNewItems = [...stackItems];
        const [moved] = finalNewItems.splice(itemIndex, 1);
        
        let insertAt = index;
        if (itemIndex < index) {
          insertAt = index - 1;
        }
        finalNewItems.splice(insertAt, 0, moved);
        onStackUpdate(finalNewItems);
      }
    } catch (err) {
      console.error("Reorder failed", err);
    }
  }
};