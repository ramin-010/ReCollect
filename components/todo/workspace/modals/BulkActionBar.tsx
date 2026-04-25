import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Calendar, Flag, UserPlus, CircleDot, Loader2, PlaySquare } from 'lucide-react';
import { AssigneeDropdown } from './AssigneeDropdown';
import { DueDateDropdown } from './DueDateDropdown';
import { PriorityDropdown } from './PriorityDropdown';
import { TaskStatusDropdown } from '../TaskStatusDropdown';

interface BulkActionBarProps {
  selectedTasks: Set<string>;
  onClearSelection: () => void;
  onDelete: (taskIds: string[]) => Promise<void>;
  onUpdate: (taskIds: string[], updates: any) => Promise<void>;
  workspaceMembers: any[];
  hideAssignees?: boolean;
}

export function BulkActionBar({
  selectedTasks,
  onClearSelection,
  onDelete,
  onUpdate,
  workspaceMembers,
  hideAssignees = false
}: BulkActionBarProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  if (selectedTasks.size === 0) return null;
  const taskIds = Array.from(selectedTasks);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(taskIds);
    setIsDeleting(false);
    onClearSelection();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-8 left-1/3 bg-[hsl(var(--background))] border-2 border-[hsl(var(--border))] rounded-2xl shadow-[0_0px_40px_rgba(0,0,0,0.1)] flex items-center px-4 py-2.5 z-[60] overflow-hidden backdrop-blur-md"
      >
        <div className="flex items-center gap-3 pr-4 border-r border-[hsl(var(--border))]">
          <div className="flex items-center justify-center h-6 px-2 rounded-md bg-[hsl(var(--muted))]/20 text-[12px] font-bold text-[hsl(var(--foreground))]">
            {selectedTasks.size} Tasks selected
          </div>
          <button 
            onClick={onClearSelection}
            className="p-1 hover:bg-[hsl(var(--muted))]/30 rounded ml-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 pl-4">
          {/* Status */}
          <TaskStatusDropdown
             currentStatus={'pending'}
             onStatusChange={async (status) => {
               setIsUpdatingStatus(true);
               await onUpdate(taskIds, { status });
               setIsUpdatingStatus(false);
               onClearSelection();
             }}
          >
            <button disabled={isUpdatingStatus} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/10 rounded-lg transition-colors outline-none cursor-pointer">
              {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CircleDot className="w-3.5 h-3.5" />}
              Status
            </button>
          </TaskStatusDropdown>

          {/* Assignees */}
          {!hideAssignees && (
            <AssigneeDropdown
              currentAssignees={[]}
              workspaceMembers={workspaceMembers}
              onAssign={async (email, name, avatar, _id) => {
                 setIsUpdatingAssignee(true);
                 const member = workspaceMembers.find(m => m.email === email);
                 if (member) {
                   await onUpdate(taskIds, { assignees: [member._id] }); 
                 }
                 setIsUpdatingAssignee(false);
                 onClearSelection();
              }}
              onUnassign={() => {}}
            >
              <button disabled={isUpdatingAssignee} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/10 rounded-lg transition-colors outline-none cursor-pointer">
                 {isUpdatingAssignee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                 Assignees
              </button>
            </AssigneeDropdown>
          )}

          {/* Due Date */}
          <DueDateDropdown
            currentDate={undefined}
            onDateChange={async (date) => {
               setIsUpdatingDate(true);
               await onUpdate(taskIds, { dueDate: date });
               setIsUpdatingDate(false);
               onClearSelection();
            }}
          >
            <button disabled={isUpdatingDate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/10 rounded-lg transition-colors outline-none cursor-pointer">
              {isUpdatingDate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
              Dates
            </button>
          </DueDateDropdown>

          {/* Priority */}
          <PriorityDropdown
            currentPriority={undefined}
            onPriorityChange={async (priority) => {
               setIsUpdatingPriority(true);
               await onUpdate(taskIds, { priority });
               setIsUpdatingPriority(false);
               onClearSelection();
            }}
          >
            <button disabled={isUpdatingPriority} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/10 rounded-lg transition-colors outline-none cursor-pointer">
              {isUpdatingPriority ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
              Priority
            </button>
          </PriorityDropdown>

          <div className="w-[1px] h-4 bg-[hsl(var(--border))] mx-1"></div>

          {/* Delete */}
          <button 
            disabled={isDeleting}
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-lg transition-colors outline-none cursor-pointer"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
