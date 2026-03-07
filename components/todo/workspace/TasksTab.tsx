import React, { useMemo } from 'react';
import { Loader2, ListTodo, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskInput } from '../task_Input';
import { TaskRow } from './TaskRow';

interface TasksTabProps {
  selectedWorkspace: any;
  workspaceMembers: any[];
  allTasks: any[];
  filteredTasks: any[];
  currentUserId?: string;
  isDataLoading: boolean;
  isInputExpanded: boolean;
  setIsInputExpanded: (val: boolean) => void;
  taskFilter: string;
  setTaskFilter: (filter: string) => void;
  handleTaskSaved: (task: any) => void;
  handleStatusChange: (taskId: string, newStatus: string) => void;
  handleUpdateTask: (taskId: string, updates: any) => void;
  handleTaskClick: (task: any) => void;
  activeSpaceId: string | null;
}

export function TasksTab({
  selectedWorkspace,
  workspaceMembers,
  allTasks,
  filteredTasks,
  currentUserId,
  isDataLoading,
  isInputExpanded,
  setIsInputExpanded,
  taskFilter,
  setTaskFilter,
  handleTaskSaved,
  handleStatusChange,
  handleUpdateTask,
  handleTaskClick,
  activeSpaceId
}: TasksTabProps) {

  // Compute filter counts from allTasks (unfiltered)
  const filterCounts = useMemo(() => {
    const all = allTasks.filter(t => t.status !== 'complete').length;
    const mine = allTasks.filter(t =>
      t.assignees?.some((a: any) => {
        const id = typeof a === 'object' ? a._id : a;
        return id === currentUserId;
      })
    ).length;
    const unassigned = allTasks.filter(t => !t.assignees || t.assignees.length === 0).length;
    const completed = allTasks.filter(t => t.status === 'complete').length;
    return { all, mine, unassigned, completed };
  }, [allTasks, currentUserId]);

  const TASK_FILTERS = [
    { key: 'all', label: 'All', count: filterCounts.all },
    { key: 'mine', label: 'Assigned to me', count: filterCounts.mine },
    { key: 'unassigned', label: 'Unassigned', count: filterCounts.unassigned },
    { key: 'completed', label: 'Completed', count: filterCounts.completed },
  ];

  return (
    <div>
      {/* Filter Bar — left-aligned with count badges, Add Task on right */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {TASK_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setTaskFilter(f.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap rounded-md flex items-center gap-2 leading-none",
                taskFilter === f.key
                  ? "text-white/80 bg-white/[0.06]"
                  : "text-white/30 hover:text-white/50"
              )}
            >
              {f.label}
              <span className={cn(
                "text-[10px] tabular-nums leading-none",
                taskFilter === f.key ? "text-white/50" : "text-white/20"
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task Table */}
      {isDataLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-4 h-4 animate-spin text-white/20" />
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Inline Add Task Input Area */}
          {selectedWorkspace && (
            <div className="px-2 py-5 ">
              <TaskInput
                isExpanded={isInputExpanded}
                onExpandChange={setIsInputExpanded}
                workspaceId={selectedWorkspace._id}
                visibility="workspace"
                onSave={handleTaskSaved}
                workspaceMembers={workspaceMembers}
                spaceId={activeSpaceId === 'all' ? undefined : activeSpaceId || undefined}
              />
            </div>
          )}

          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_130px_120px_120px_100px_80px] gap-2 px-3 py-2 border-b border-white/10 text-[12px] font-medium text-white/50 items-center select-none">
            <div className="flex justify-center"></div>
            <div className="pl-1 text-white/70"> Tasks</div>
            <div className="flex justify-start font-semibold pr-2">Status</div>
            <div className="flex justify-start font-semibold px-2">Assignee</div>
            <div className="flex justify-start font-semibold px-2">Due date</div>
            <div className="flex justify-start font-semibold px-2">Reminder</div>
            <div className="flex justify-start font-semibold px-2">Priority</div>
            <div></div>
          </div>
          
          {/* Table Body */}
          <div className="flex flex-col">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-3">
                  <ListTodo className="w-4 h-4 text-white/20" />
                </div>
                <p className="text-sm text-white/35 mb-1">
                  {taskFilter === 'all' ? 'No tasks yet' :
                   taskFilter === 'mine' ? 'No tasks assigned to you' :
                   taskFilter === 'unassigned' ? 'No unassigned tasks' :
                   'No completed tasks'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskRow 
                  key={task._id} 
                  task={task} 
                  workspaceMembers={workspaceMembers}
                  onStatusChange={handleStatusChange}
                  onUpdateTask={handleUpdateTask}
                  onClick={handleTaskClick}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
