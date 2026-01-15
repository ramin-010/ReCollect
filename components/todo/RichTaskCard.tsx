'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2,
  Circle,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  AlignLeft,
  Link2,
  CheckSquare,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/lib/store/todoStore';
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { Button } from '@/components/ui-base/Button';

interface RichTaskCardProps {
  task: Task;
  layout?: 'grid' | 'list';
  index?: number;
  onToggleComplete: (id: string, currentStatus: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, isCompleted: boolean) => void;
}

export function RichTaskCard({ 
  task, 
  layout = 'list',
  index = 0,
  onToggleComplete, 
  onEdit, 
  onDelete,
  onToggleSubtask 
}: RichTaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCompleted = task.status === 'complete' || task.isCompleted;
  
  // Date formatting
  const dateInfo = useMemo(() => {
    if (!task.dueDate) return null;
    const date = new Date(task.dueDate);
    const overdue = isPast(date) && !isToday(date) && !isCompleted;
    
    let text = format(date, 'MMM d');
    if (isToday(date)) text = 'Today';
    if (isTomorrow(date)) text = 'Tomorrow';
    
    return { text, overdue, date };
  }, [task.dueDate, isCompleted]);

  // Neon Colors based on Priority
  const theme = useMemo(() => {
    switch(task.priority) {
      case 'high': return {
        border: 'border-rose-500/50',
        bg: 'bg-rose-500/5',
        text: 'text-rose-400',
        hover: 'group-hover:border-rose-500/80'
      };
      case 'medium': return {
        border: 'border-amber-500/50',
        bg: 'bg-amber-500/5',
        text: 'text-amber-400',
        hover: 'group-hover:border-amber-500/80'
      };
      default: return {
        border: 'border-blue-500/30',
        bg: 'bg-blue-500/5',
        text: 'text-blue-400',
        hover: 'group-hover:border-blue-500/60'
      };
    }
  }, [task.priority]);

  const hasContent = !!(task.description || (task.subtasks && task.subtasks.length > 0));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className={cn(
        "group relative overflow-hidden transition-all duration-300 bg-[hsl(var(--card))]",
        theme.border,
        theme.hover,
        layout === 'grid' ? "rounded-2xl p-5 flex flex-col h-full" : "rounded-xl p-4 flex items-center gap-4",
        "border"
      )}
    >
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* CHECKBOX */}
      <div className={cn("relative z-10", layout === 'grid' ? "mb-4 flex justify-between items-start" : "")}>
         <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(task._id, isCompleted);
            }}
            className={cn(
               "relative flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-300",
               isCompleted 
                 ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                 : `border-white/20 hover:border-white/50 ${theme.text}`
            )}
          >
            {isCompleted && <CheckCircle2 className="w-4 h-4" />}
         </button>

         {/* Grid Mode: Priority Badge top right */}
         {layout === 'grid' && (
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/20 hover:text-white hover:bg-white/5 rounded-full" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0A0A0A] border-white/10 text-white">
                <DropdownMenuItem onClick={() => onEdit(task)} className="focus:bg-white/10 focus:text-white">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(task._id)} className="text-rose-400 focus:text-rose-400 focus:bg-rose-500/10">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
         )}
      </div>

      {/* CONTENT */}
      <div className={cn("relative z-10 flex-1 min-w-0 cursor-pointer", layout === 'grid' ? "space-y-3" : "")} onClick={() => hasContent && setIsExpanded(!isExpanded)}>
        
        {/* Title & Metadata */}
        <div>
          <h3 className={cn(
            "font-semibold text-white tracking-tight transition-all",
            layout === 'grid' ? "text-lg leading-snug" : "text-base",
            isCompleted && "line-through text-white/30"
          )}>
            {task.text}
          </h3>
          
          <div className={cn("flex items-center gap-3 mt-1.5", layout === 'grid' ? "flex-wrap" : "")}>
             {/* Date Pill */}
             {dateInfo && (
               <div className={cn(
                 "flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border border-white/5 bg-white/5",
                 dateInfo.overdue ? "text-rose-400 border-rose-500/20 bg-rose-500/10" : "text-white/60"
               )}>
                 <Calendar className="w-3 h-3" />
                 <span>{dateInfo.text}</span>
               </div>
             )}

             {/* Subtasks Pill */}
             {task.subtasks && task.subtasks.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-white/50">
                   <CheckSquare className="w-3 h-3" />
                   <span>{task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}</span>
                </div>
             )}
             
             {/* List Mode: Priority label */}
             {layout === 'list' && task.priority && (
                <span className={cn("text-xs uppercase tracking-wider font-bold", theme.text)}>
                   {task.priority}
                </span>
             )}
          </div>
        </div>

        {/* EXPANDED CONTENT (Inline for Grid, Animated for List) */}
        <AnimatePresence>
          {(isExpanded || layout === 'grid') && hasContent && (layout === 'grid' ? true : isExpanded) && (
             <motion.div
               initial={layout === 'list' ? { height: 0, opacity: 0, marginTop: 0 } : { opacity: 1 }}
               animate={layout === 'list' ? { height: 'auto', opacity: 1, marginTop: 12 } : { opacity: 1 }}
               exit={layout === 'list' ? { height: 0, opacity: 0, marginTop: 0 } : {}}
               className={cn("overflow-hidden", layout === 'list' ? "w-full" : "pt-2 border-t border-white/5")}
             >
                {/* Description */}
                {task.description && (
                  <p className="text-sm text-white/50 leading-relaxed line-clamp-3 mb-3">
                    {task.description}
                  </p>
                )}

                {/* Subtasks Preview */}
                {task.subtasks && task.subtasks.length > 0 && (
                   <div className="space-y-1">
                      {task.subtasks.slice(0, layout === 'grid' ? 3 : undefined).map(sub => (
                         <div key={sub.id} className="flex items-center gap-2 group/sub">
                            <div className={cn(
                               "w-1.5 h-1.5 rounded-full transition-colors",
                               sub.isCompleted ? "bg-emerald-500" : "bg-white/20 group-hover/sub:bg-emerald-500/50"
                            )} />
                            <span className={cn(
                               "text-xs transition-colors truncate",
                               sub.isCompleted ? "text-white/30 line-through" : "text-white/70"
                            )}>
                               {sub.text}
                            </span>
                         </div>
                      ))}
                      {layout === 'grid' && task.subtasks.length > 3 && (
                         <div className="text-xs text-white/30 pl-3.5">+{task.subtasks.length - 3} more</div>
                      )}
                   </div>
                )}
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List Mode: Actions on right */}
      {layout === 'list' && (
         <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/20 hover:text-white hover:bg-white/5 rounded-full" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0A0A0A] border-white/10 text-white">
                <DropdownMenuItem onClick={() => onEdit(task)} className="focus:bg-white/10 focus:text-white">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(task._id)} className="text-rose-400 focus:text-rose-400 focus:bg-rose-500/10">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
         </div>
      )}
    </motion.div>
  );
}

export default RichTaskCard;
