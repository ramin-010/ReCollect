'use client';

/**
 * Table handles on our chrome (BlockNote's TableHandlesController draws them where they go; these are
 * what it draws): a grip on the hovered row (left) and column (top) that drags it or opens its menu
 * (insert before / after, header, delete), and a "+" strip under and beside the table that adds a
 * row or a column. BlockNote's own parts need a component library we don't load.
 */
import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, GripHorizontal, GripVertical, Plus } from 'lucide-react';
import { TableHandlesExtension } from '@blocknote/core/extensions';
import { useBlockNoteEditor, useExtension, useExtensionState } from '@blocknote/react';
import { cn } from '@/lib/utils';
import { rcScope } from '@/components/rc-ui';

type HandleProps = { orientation: 'row' | 'column'; hideOtherElements: (hide: boolean) => void };
type ExtendProps = { orientation: 'addOrRemoveRows' | 'addOrRemoveColumns'; hideOtherElements: (hide: boolean) => void };

type TableContent = { type: 'tableContent'; rows: unknown[]; headerRows?: number; headerCols?: number };
type TableBlock = { id: string; type: string; content: TableContent };

export function RcTableHandle({ orientation, hideOtherElements }: HandleProps) {
  const editor = useBlockNoteEditor() as unknown as { focus: () => void; updateBlock: (b: unknown, u: unknown) => void };
  const handles = useExtension(TableHandlesExtension);
  const state = useExtensionState(TableHandlesExtension) as { block?: TableBlock; rowIndex?: number; colIndex?: number } | undefined;
  const [dragging, setDragging] = useState(false);
  if (!state?.block || state.block.type !== 'table') return null;
  const index = orientation === 'row' ? state.rowIndex : state.colIndex;
  if (index === undefined) return null;
  const block = state.block;
  const row = orientation === 'row';
  const isHeader = row ? Boolean(block.content.headerRows) && index === 0 : Boolean(block.content.headerCols) && index === 0;

  const add = (side: 'above' | 'below' | 'left' | 'right') =>
    handles.addRowOrColumn(index, row ? { orientation: 'row', side: side as 'above' | 'below' } : { orientation: 'column', side: side as 'left' | 'right' });
  const toggleHeader = () =>
    editor.updateBlock(block, {
      type: 'table',
      content: { ...block.content, ...(row ? { headerRows: block.content.headerRows ? undefined : 1 } : { headerCols: block.content.headerCols ? undefined : 1 }) },
    });

  return (
    <DropdownMenu.Root
      modal={false}
      onOpenChange={(open) => {
        if (open) {
          handles.freezeHandles();
          hideOtherElements(true);
        } else {
          handles.unfreezeHandles();
          hideOtherElements(false);
          editor.focus();
        }
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn('lab-table-handle', `lab-table-handle--${orientation}`, dragging && 'is-dragging')}
          aria-label={row ? 'Row: drag to move, click for options' : 'Column: drag to move, click for options'}
          draggable
          onDragStart={(e) => {
            setDragging(true);
            hideOtherElements(true);
            if (row) handles.rowDragStart(e as never);
            else handles.colDragStart(e as never);
          }}
          onDragEnd={() => {
            handles.dragEnd();
            hideOtherElements(false);
            setDragging(false);
          }}
        >
          {row ? <GripVertical aria-hidden /> : <GripHorizontal aria-hidden />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side={row ? 'right' : 'bottom'} align="start" sideOffset={4} collisionPadding={12} className={cn(rcScope, 'rc-float rc-menu lab-table-menu')}>
          <DropdownMenu.Item className="rc-menu-item" onSelect={() => add(row ? 'above' : 'left')}>
            {row ? 'Insert above' : 'Insert left'}
          </DropdownMenu.Item>
          <DropdownMenu.Item className="rc-menu-item" onSelect={() => add(row ? 'below' : 'right')}>
            {row ? 'Insert below' : 'Insert right'}
          </DropdownMenu.Item>
          {index === 0 && (
            <DropdownMenu.Item className="rc-menu-item justify-between" onSelect={toggleHeader}>
              {row ? 'Header row' : 'Header column'}
              {isHeader && <Check aria-label="On" className="lab-table-check" />}
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="rc-menu-sep" />
          <DropdownMenu.Item className="rc-menu-item" data-danger onSelect={() => handles.removeRowOrColumn(index, orientation)}>
            {row ? 'Delete row' : 'Delete column'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** The "+" strip under the table (a row) or beside it (a column): one click adds one at the end. */
export function RcTableExtend({ orientation, hideOtherElements }: ExtendProps) {
  const editor = useBlockNoteEditor() as unknown as { updateBlock: (b: unknown, u: unknown) => void };
  const handles = useExtension(TableHandlesExtension);
  const block = useExtensionState(TableHandlesExtension, { selector: (s) => s?.block }) as TableBlock | undefined;
  if (!block) return null;
  const rows = orientation === 'addOrRemoveRows';
  return (
    <button
      type="button"
      className={cn('lab-table-extend', rows ? 'lab-table-extend--rows' : 'lab-table-extend--cols')}
      aria-label={rows ? 'Add a row' : 'Add a column'}
      title={rows ? 'Add a row' : 'Add a column'}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={() => hideOtherElements(false)}
      onClick={() =>
        editor.updateBlock(block, {
          type: 'table',
          content: { ...block.content, rows: handles.addRowsOrColumns(block as never, rows ? 'rows' : 'columns', 1) },
        })
      }
    >
      <Plus aria-hidden />
    </button>
  );
}

/** No per-cell button (BlockNote's merges cells and colours them; not in our tables yet). */
export function NoCellHandle() {
  return null;
}
