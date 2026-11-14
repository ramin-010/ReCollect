'use client';

import { useState } from 'react';
import { CalendarIcon, CheckCircle2, Circle, ExternalLink, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui-base/DropdownMenu';
import { AlertDialog } from '@/components/ui-base/Dialog';
import { lx } from './styles';

interface ItemActionMenuProps {
  isDone: boolean;
  onToggle: () => void;
  /** Hidden for done items (Revise only offered it on pending ones). */
  onReschedule?: () => void;
  onOpen?: () => void;
  onEdit?: () => void;
  /** Asks first (AlertDialog instead of Revise's window.confirm). */
  onDelete?: () => void;
  deleteLabel?: string;
  completeLabel?: string;
  /** Classes of the empty circle (Revise's circleColorClass + hoverColorClass). */
  circleClassName?: string;
  sizeClassName?: string;
}

/**
 * Revise TaskActionMenu: the row's circle opens a menu (Complete · Reschedule · Open · Edit ·
 * Delete); a done row shows a green check whose menu offers Unmark · Open · Edit.
 */
export function ItemActionMenu({
  isDone,
  onToggle,
  onReschedule,
  onOpen,
  onEdit,
  onDelete,
  deleteLabel = 'Delete',
  completeLabel = 'Complete',
  circleClassName = cn(lx.muted, 'group-hover:text-[hsl(var(--primary))]'),
  sizeClassName = 'w-5 h-5',
}: ItemActionMenuProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = 'gap-3 px-3 py-2 rounded-lg text-[13px] font-medium';

  return (
    <div className="shrink-0 relative h-5 flex items-center justify-center z-10 ml-2" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(sizeClassName, 'flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]')}
            aria-label={isDone ? 'Done: open actions' : 'Open actions'}
          >
            {isDone ? (
              <CheckCircle2 className={cn(sizeClassName, 'text-[hsl(var(--success))]/70 hover:text-[hsl(var(--success))] transition-colors')} />
            ) : (
              <Circle className={cn(sizeClassName, 'transition-colors', circleClassName)} />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px] rounded-xl p-1 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
          <DropdownMenuItem className={item} onClick={onToggle}>
            {isDone ? (
              <>
                <RotateCcw className="w-[15px] h-[15px] text-[hsl(var(--warning))]" /> Unmark
              </>
            ) : (
              <>
                <CheckCircle2 className="w-[15px] h-[15px] text-[hsl(var(--success))]" /> {completeLabel}
              </>
            )}
          </DropdownMenuItem>
          {!isDone && onReschedule && (
            <DropdownMenuItem className={item} onClick={onReschedule}>
              <CalendarIcon className={cn('w-[15px] h-[15px]', lx.primaryText)} /> Reschedule
            </DropdownMenuItem>
          )}
          {onOpen && (
            <DropdownMenuItem className={item} onClick={onOpen}>
              <ExternalLink className={cn('w-[15px] h-[15px]', lx.muted)} /> Open
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem className={item} onClick={onEdit}>
              <Pencil className={cn('w-[15px] h-[15px]', lx.muted)} /> Edit
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem className={item} destructive onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-[15px] h-[15px]" /> {deleteLabel}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {onDelete && (
        <AlertDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`${deleteLabel}?`}
          description="This cannot be undone."
          confirmText={deleteLabel}
          variant="destructive"
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete();
          }}
        />
      )}
    </div>
  );
}
