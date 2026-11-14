'use client';

import { Fragment } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lx } from '../styles';

/**
 * The Day Manager's reorder seam. Everything about HOW a block is moved lives here; the
 * dialog only supplies `onMove(activeId, overId)` (engine `moveSlot`) and renders each row.
 *
 * Today: ↑/↓ buttons (move onto the neighbour's position).
 * With @dnd-kit (pending approval, LEARNING_SPEC §3) this file becomes:
 *   <DndContext sensors={[PointerSensor {distance:5}, KeyboardSensor {sortableKeyboardCoordinates}]}
 *               collisionDetection={closestCenter} onDragEnd={({active, over}) => over && onMove(active.id, over.id)}>
 *     <SortableContext items={ids} strategy={verticalListSortingStrategy}> … useSortable per row …
 * and `handle` becomes the GripVertical with the sortable listeners. No caller changes.
 */
export interface SortableSlotListProps {
  /** Unresolved slot ids in display order. */
  ids: string[];
  /** Ids that cannot move (the ACTIVE block: Revise disabled dragging it). */
  lockedIds?: ReadonlySet<string>;
  onMove: (activeId: string, overId: string) => void;
  /** Renders one row; put `handle` where the drag grip goes. `before` renders above it (gap rows). */
  renderRow: (id: string, handle: React.ReactNode) => { before?: React.ReactNode; row: React.ReactNode };
}

export function SortableSlotList({ ids, lockedIds, onMove, renderRow }: SortableSlotListProps) {
  return (
    <>
      {ids.map((id, i) => {
        const locked = lockedIds?.has(id) ?? false;
        const prev = ids[i - 1];
        const next = ids[i + 1];
        const canUp = !locked && prev !== undefined && !lockedIds?.has(prev);
        const canDown = !locked && next !== undefined && !lockedIds?.has(next);
        const btn = cn('p-0.5 rounded transition-colors disabled:opacity-20 disabled:cursor-default hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover);
        const handle = locked ? null : (
          <div className="flex flex-col shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" className={btn} disabled={!canUp} onClick={() => prev && onMove(id, prev)} title="Move up" aria-label="Move block up">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button type="button" className={btn} disabled={!canDown} onClick={() => next && onMove(id, next)} title="Move down" aria-label="Move block down">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        );
        const { before, row } = renderRow(id, handle);
        return (
          <Fragment key={id}>
            {before}
            {row}
          </Fragment>
        );
      })}
    </>
  );
}
