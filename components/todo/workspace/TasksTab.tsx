import React, { useMemo, useState } from 'react';
import { Loader2, ListTodo, Plus, LayoutList, Table, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskRow';
import { TableView } from './TableView';
import { CalendarView } from './CalendarView';
import { workspaceTodoApi } from '@/lib/api/workspaceTodoApi';
import { BulkActionBar } from './modals/BulkActionBar';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import { toast } from 'sonner';

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
  isViewer?: boolean;
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
  activeSpaceId,
  isViewer
}: TasksTabProps) {
  const [currentView, setCurrentView] = useState<'list' | 'table' | 'calendar'>('list');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const { tasks: storeTasks, setTasks } = useWorkspaceStore();

  const handleBulkUpdate = async (taskIds: string[], updates: any) => {
     for (const id of taskIds) {
       handleUpdateTask(id, updates);
     }
  };

  const handleBulkDelete = async (taskIds: string[]) => {
    try {
      const deletePromises = taskIds.map(id => workspaceTodoApi.deleteTodo(id));
      await Promise.all(deletePromises);
      
      const remainingTasks = storeTasks.filter(t => !taskIds.includes(t._id));
      setTasks(remainingTasks);
      toast.success(`${taskIds.length} tasks deleted`);
    } catch {
      toast.error('Failed to delete some tasks');
    }
  };

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

        {/* View Switcher Controls */}
        <div className="flex items-center bg-white/[0.03] p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => setCurrentView('list')}
            className={cn("p-1.5 rounded-md transition-colors", currentView === 'list' ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5")}
            title="List View"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setCurrentView('table')}
            className={cn("p-1.5 rounded-md transition-colors", currentView === 'table' ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5")}
            title="Table View"
          >
            <Table className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setCurrentView('calendar')}
            className={cn("p-1.5 rounded-md transition-colors", currentView === 'calendar' ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5")}
            title="Calendar View"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task Table */}
      {isDataLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-4 h-4 animate-spin text-white/20" />
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Views Area */}
          {currentView === 'list' && (
            <>
              {/* Table Header (List View Only) */}
              <div className="grid grid-cols-[40px_minmax(0,1fr)_120px_130px_120px_90px] gap-4 px-4 py-2  text-[12px] font-medium text-white/50 items-center select-none">
                <div className="flex justify-center"></div>
                <div className="flex items-center">Tasks</div>
                <div className="flex items-center">Assignee</div>
                <div className="flex items-center">Due date</div>
                <div className="flex items-center">Status</div>
                <div className="flex items-center">Priority</div>
              </div>
              
              {/* List Body */}
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
                      isViewer={isViewer}
                      isSelected={selectedTasks.has(task._id)}
                      onToggleSelect={(id) => setSelectedTasks(prev => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      })}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {currentView === 'table' && (
            <TableView 
              filteredTasks={filteredTasks}
              workspaceMembers={workspaceMembers}
              onStatusChange={handleStatusChange}
              onUpdateTask={handleUpdateTask}
              onClick={handleTaskClick}
              taskFilter={taskFilter}
              isViewer={isViewer}
            />
          )}

          {currentView === 'calendar' && (
            <div className="h-[600px]">
              <CalendarView 
                filteredTasks={filteredTasks}
                onClick={handleTaskClick}
                onUpdateTask={handleUpdateTask}
              />
            </div>
          )}
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar 
        selectedTasks={selectedTasks}
        onClearSelection={() => setSelectedTasks(new Set())}
        onDelete={handleBulkDelete}
        onUpdate={handleBulkUpdate}
        workspaceMembers={workspaceMembers}
      />
    </div>
  );
}
