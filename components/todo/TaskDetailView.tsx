'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Flag, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  User,
  Tag,
  Clock,
  MoreHorizontal,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, Subtask } from '@/lib/store/todoStore';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { AssigneePicker } from './AssigneePicker';
import { format, isToday, isTomorrow, parseISO, formatDistanceToNow } from 'date-fns';
import { useTodoStore } from '@/lib/store/todoStore';
import { toast } from 'sonner';
import { todoApi } from '@/lib/api/todoApi';

interface TaskDetailViewProps {
  task: Task;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export function TaskDetailView({ task, onBack, onUpdate, onDelete }: TaskDetailViewProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { updateTodo: updateLocalStore } = useTodoStore();

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
  }, [task]);

  const hasChanges = title !== task.title || description !== (task.description || '');

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;
    
    setIsSaving(true);
    try {
      const updates: Partial<Task> = {};
      if (title !== task.title) updates.title = title;
      if (description !== (task.description || '')) updates.description = description;

      const result = await todoApi.updateTodo(task._id, updates as any);
      if (result.success && result.data) {
        onUpdate(task._id, result.data);
        toast.success('Task updated');
      } else {
        toast.error(result.message || 'Failed to update task');
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update task');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleComplete = () => {
    const newStatus = task.status === 'complete' ? 'pending' : 'complete';
    onUpdate(task._id, { status: newStatus });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: newSubtaskText.trim(),
      isCompleted: false
    };
    const newSubtasks = [...(task.subtasks || []), newSubtask];
    onUpdate(task._id, { subtasks: newSubtasks });
    setNewSubtaskText('');
    setIsAddingSubtask(false);
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      setNewSubtaskText('');
      setIsAddingSubtask(false);
    }
  };

  const toggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    const newSubtasks = task.subtasks?.map(st => 
      st.id === subtaskId ? { ...st, isCompleted: !currentStatus } : st
    );
    if (!newSubtasks) return;
    updateLocalStore(task._id, { subtasks: newSubtasks });
    
    try {
      if (todoApi.updateSubtask) {
        await todoApi.updateSubtask(task._id, subtaskId, { isCompleted: !currentStatus });
      }
    } catch (e) {
      toast.error('Failed to update subtask');
    }
  };

  // Format helpers
  const dateLabel = task.dueDate 
    ? isToday(parseISO(task.dueDate)) ? 'Today' 
      : isTomorrow(parseISO(task.dueDate)) ? 'Tomorrow'
      : format(parseISO(task.dueDate), 'MMM d, yyyy')
    : null;

  const createdAgo = formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true });
  const isComplete = task.status === 'complete';
  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full"
    >
      {/* Minimal Top Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back</span>
        </button>

        <div className="flex items-center gap-2">
          {hasChanges && (
             <button
               onClick={handleSave}
               disabled={isSaving}
               className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
             >
               {isSaving ? (
                 <>
                   <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   Saving...
                 </>
               ) : (
                 'Save Changes'
               )}
             </button>
          )}

          <button
            onClick={toggleComplete}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              isComplete 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "text-white/50 hover:bg-white/5 hover:text-white"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isComplete ? 'Done' : 'Complete'}
          </button>
          <button 
            onClick={() => onDelete(task._id)}
            className="p-2 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area with Two Columns */}
      <div className="flex-1 pt-8 flex gap-8">
        
        {/* LEFT: Main Content */}
        <div className="flex-1 min-w-0">
          
          {/* Title */}
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(
              "w-full bg-transparent text-2xl font-semibold border-none outline-none focus:ring-0 p-0 mb-1 transition-colors",
              isComplete ? "text-white/40 line-through" : "text-white placeholder-white/20"
            )}
            placeholder="Task title"
          />

          {/* Created timestamp */}
          <p className="text-xs text-white/30 mb-6 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Created {createdAgo}
          </p>

          {/* Description */}
          <div className="min-h-[200px] p-0">
            <TaskDescriptionEditor 
              content={description}
              onChange={setDescription}
              placeholder="Write a description..."
            />
          </div>

          {/* Subtasks Section */}
          {(task.subtasks && task.subtasks.length > 0) || true ? (
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white/60">Subtasks</span>
                  {totalSubtasks > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-emerald-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${subtaskProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-xs text-white/40">{completedSubtasks}/{totalSubtasks}</span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setIsAddingSubtask(true)}
                  className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {task.subtasks?.map(st => (
                  <div 
                    key={st.id}
                    className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-white/[0.02] transition-colors group"
                  >
                    <button
                      onClick={() => toggleSubtask(st.id, st.isCompleted)}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                        st.isCompleted 
                          ? "bg-emerald-500 border-emerald-500" 
                          : "border-white/20 hover:border-emerald-400"
                      )}
                    >
                      {st.isCompleted && (
                        <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={cn(
                      "text-sm transition-colors",
                      st.isCompleted ? "text-white/30 line-through" : "text-white/80"
                    )}>
                      {st.text}
                    </span>
                  </div>
                ))}
                
                {/* Inline Add Subtask Input */}
                {isAddingSubtask ? (
                  <div className="flex items-center gap-3 py-2 px-3 -mx-3">
                    <div className="w-4 h-4 rounded border border-dashed border-white/20 shrink-0" />
                    <input
                      type="text"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      onKeyDown={handleSubtaskKeyDown}
                      onBlur={() => {
                        if (!newSubtaskText.trim()) {
                          setIsAddingSubtask(false);
                        }
                      }}
                      placeholder="Add subtask..."
                      className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/30 border-none outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleAddSubtask}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setNewSubtaskText('');
                        setIsAddingSubtask(false);
                      }}
                      className="text-white/30 hover:text-white/60"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  (!task.subtasks || task.subtasks.length === 0) && (
                    <p className="text-sm text-white/20 italic py-2">No subtasks yet</p>
                  )
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* RIGHT: Properties Sidebar */}
        <div className="w-52 shrink-0 space-y-5">
          
          {/* Status */}
          <div>
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2 block">Status</label>
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium",
              isComplete ? "text-emerald-400" : "text-white/70"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isComplete ? "bg-emerald-500" : "bg-amber-500"
              )} />
              {isComplete ? 'Complete' : 'In Progress'}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2 block">Priority</label>
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium",
              task.priority === 'high' ? "text-rose-400" :
              task.priority === 'medium' ? "text-amber-400" : "text-blue-400"
            )}>
              <Flag className="w-3.5 h-3.5" />
              <span className="capitalize">{task.priority || 'Normal'}</span>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2 block">Due Date</label>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Calendar className="w-3.5 h-3.5 text-white/40" />
              <span>{dateLabel || <span className="text-white/30 italic">Not set</span>}</span>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2 block">Assignee</label>
            <AssigneePicker
              taskId={task._id}
              currentAssignees={task.assignees}
              onAssigned={(updatedTask) => {
                onUpdate(task._id, {
                  assignees: updatedTask.assignees,
                  assignedAt: updatedTask.assignedAt,
                });
                toast.success(updatedTask.message || 'Task assigned');
              }}
              onUnassigned={() => {
                onUpdate(task._id, {
                  assignees: [],
                  assignedAt: undefined,
                });
                toast.success('Assignees removed');
              }}
            />
          </div>

          {/* Labels */}
          <div>
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2 block">Labels</label>
            {task.labels && task.labels.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {task.labels.map(l => (
                  <span 
                    key={l.id}
                    className="px-2 py-0.5 rounded text-[10px] font-medium border"
                    style={{ 
                      borderColor: `${l.color}50`,
                      backgroundColor: `${l.color}15`,
                      color: l.color 
                    }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/30">
                <Tag className="w-3.5 h-3.5" />
                <span className="text-sm italic">No labels</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}
