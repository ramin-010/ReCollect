import React from 'react';
import { Loader2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskInput } from '../task_Input';
import { TaskRow } from './TaskRow';

interface TasksTabProps {
  selectedWorkspace: any;
  workspaceMembers: any[];
  filteredTasks: any[];
  isDataLoading: boolean;
  isInputExpanded: boolean;
  setIsInputExpanded: (val: boolean) => void;
  taskFilter: string;
  setTaskFilter: (filter: string) => void;
  handleTaskSaved: (task: any) => void;
  handleToggleTaskStatus: (taskId: string, currentStatus: string) => void;
  handleTaskClick: (task: any) => void;
  activeSpaceId: string | null;
}

const TASK_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Assigned to me' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'completed', label: 'Completed' },
];

export function TasksTab({
  selectedWorkspace,
  workspaceMembers,
  filteredTasks,
  isDataLoading,
  isInputExpanded,
  setIsInputExpanded,
  taskFilter,
  setTaskFilter,
  handleTaskSaved,
  handleToggleTaskStatus,
  handleTaskClick,
  activeSpaceId
}: TasksTabProps) {
  return (
    <div className="space-y-4">
      {/* Task Input */}
      {selectedWorkspace && (
        <div className="mb-8 max-w-[800px] mx-auto ">
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

      {/* Filter Bar — underline style (no container box) */}
      <div className="flex items-center justify-center gap-1 -mt-1">
        {TASK_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setTaskFilter(f.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap rounded-md",
              taskFilter === f.key
                ? "text-white/80 bg-white/[0.06]"
                : "text-white/25 hover:text-white/45"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task Table */}
      {isDataLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-4 h-4 animate-spin text-white/20" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-3">
            <ListTodo className="w-5 h-5 text-white/20" />
          </div>
          <p className="text-sm text-white/35 mb-1">
            {taskFilter === 'all' ? 'No workspace tasks yet' :
             taskFilter === 'mine' ? 'No tasks assigned to you' :
             taskFilter === 'unassigned' ? 'No unassigned tasks' :
             'No completed tasks'}
          </p>
          {taskFilter === 'all' && (
            <p className="text-xs text-white/20">
              Use the input above to create a workspace task.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] overflow-hidden">
          <div className="divide-y divide-white/[0.025]">
            {filteredTasks.map((task) => (
              <TaskRow 
                key={task._id} 
                task={task} 
                onToggleStatus={handleToggleTaskStatus}
                onClick={handleTaskClick} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
