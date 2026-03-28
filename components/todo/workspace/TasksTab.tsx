import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ListTodo, Plus, LayoutList, Table, CalendarDays, ArrowDownUp, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskRow';
import { TableView } from './TableView';
import { CalendarView } from './CalendarView';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui-base/DropdownMenu';
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
  sortBy: 'priority' | 'dueDate' | 'recent';
  setSortBy: (sort: 'priority' | 'dueDate' | 'recent') => void;
  assigneeFilter: string;
  setAssigneeFilter: (assigneeId: string) => void;
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
  sortBy,
  setSortBy,
  assigneeFilter,
  setAssigneeFilter,
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
    <div className="w-full">
      {/* Filter Bar — left-aligned with count badges, Add Task on right */}
      <div className="max-w-[1000px] mx-auto px-6 md:px-8 w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {TASK_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setTaskFilter(f.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap rounded-md flex items-center gap-2 leading-none",
                taskFilter === f.key
                  ? "text-[hsl(var(--foreground))]/80 bg-[hsl(var(--muted))]/40"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              )}
            >
              {f.label}
              <span className={cn(
                "text-[10px] tabular-nums leading-none",
                taskFilter === f.key ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]/40"
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Active Assignee Filter Badge */}
          {assigneeFilter !== 'all' && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[hsl(var(--muted))]/20 text-[hsl(var(--foreground))] text-xs font-medium rounded-md border border-[hsl(var(--border))]">
              {(() => {
                const m = workspaceMembers.find(member => member._id === assigneeFilter);
                if (!m) return null;
                return (
                  <>
                    {m.avatar ? (
                      <img src={m.avatar} alt="" className="w-3.5 h-3.5 rounded-full" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center text-[7px] font-bold text-[hsl(var(--background))]">
                        {m.name.charAt(0)}
                      </div>
                    )}
                    <span>{m.name}</span>
                    <button 
                      onClick={() => setAssigneeFilter('all')}
                      className="ml-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          {/* Combined Sort & Filter Dropdown */}
          <div className="flex items-center gap-1 mr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "px-3 py-1.5 flex items-center gap-2 text-xs font-medium border rounded-md transition-colors",
                  "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30"
                )}>
                  <ArrowDownUp className="w-3.5 h-3.5" />
                  Sort
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); setSortBy('priority'); }} className={cn(sortBy === 'priority' ? "bg-[hsl(var(--muted))]/20 font-medium" : "")}>
                  Priority {sortBy === 'priority' && <span className="ml-auto text-[hsl(var(--muted-foreground))]/60 text-[10px]">Active</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); setSortBy('dueDate'); }} className={cn(sortBy === 'dueDate' ? "bg-[hsl(var(--muted))]/20 font-medium" : "")}>
                  Due Date {sortBy === 'dueDate' && <span className="ml-auto text-[hsl(var(--muted-foreground))]/60 text-[10px]">Active</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); setSortBy('recent'); }} className={cn(sortBy === 'recent' ? "bg-[hsl(var(--muted))]/20 font-medium" : "")}>
                  Recently Added {sortBy === 'recent' && <span className="ml-auto text-[hsl(var(--muted-foreground))]/60 text-[10px]">Active</span>}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]/50" />
                    Filter by Assignee
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-[180px]">
                    <DropdownMenuItem onClick={(e) => { e.preventDefault(); setAssigneeFilter('all'); }} className={cn(assigneeFilter === 'all' ? "bg-[hsl(var(--muted))]/20 font-medium" : "")}>
                      Anyone
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {workspaceMembers.map(m => (
                      <DropdownMenuItem key={m._id} onClick={(e) => { e.preventDefault(); setAssigneeFilter(m._id); }} className={cn(assigneeFilter === m._id ? "bg-[hsl(var(--muted))]/20 font-medium" : "")}>
                        <div className="flex items-center gap-2">
                          {m.avatar ? <img src={m.avatar} alt="" className="w-4 h-4 rounded-full" /> : <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] font-medium text-[hsl(var(--background))]">{m.name.charAt(0)}</div>}
                          {m.name}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* View Switcher Controls */}
          <div className="flex items-center bg-[hsl(var(--muted))]/10 p-1 rounded-lg border border-[hsl(var(--border))]">
            <button 
              onClick={() => setCurrentView('list')}
              className={cn("p-1.5 rounded-md transition-colors", currentView === 'list' ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30")}
              title="List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentView('table')}
              className={cn("p-1.5 rounded-md transition-colors", currentView === 'table' ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30")}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentView('calendar')}
              className={cn("p-1.5 rounded-md transition-colors", currentView === 'calendar' ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30")}
              title="Calendar View"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Table */}
      {isDataLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))]/30" />
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Views Area — animated transitions */}
          <AnimatePresence mode="wait">
            {currentView === 'list' && (
              <motion.div
                key="list-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-[1000px] mx-auto px-4 md:px-4 w-full"
              >
              {/* Table Header (List View Only) */}
              <div className="grid grid-cols-[40px_minmax(0,1fr)_120px_130px_120px_50px] gap-4 px-4 py-2  text-[12px] font-medium text-[hsl(var(--muted-foreground))] items-center select-none">
                <div className="flex justify-center"></div>
                <div className="flex items-center">Tasks</div>
                <div className="flex items-center">Assignee</div>
                <div className="flex items-center">Due date</div>
                <div className="flex items-center">Status</div>
                <div className="flex items-center">Priority</div>
              </div>
              
              {/* List Body */}
              <div className="flex flex-col ">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-10 h-10 rounded-lg bg-[hsl(var(--muted))]/10 border border-[hsl(var(--border))] flex items-center justify-center mx-auto mb-3">
                      <ListTodo className="w-4 h-4 text-[hsl(var(--muted-foreground))]/30" />
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">
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
              </motion.div>
            )}

            {currentView === 'table' && (
              <motion.div
                key="table-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="px-6 md:px-8 w-[1200px] mx-auto"
              >
              <TableView 
                filteredTasks={filteredTasks}
                workspaceMembers={workspaceMembers}
                onStatusChange={handleStatusChange}
                onUpdateTask={handleUpdateTask}
                onClick={handleTaskClick}
                taskFilter={taskFilter}
                isViewer={isViewer}
                selectedTasks={selectedTasks}
                onToggleSelect={(id) => setSelectedTasks(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })}
              />
              </motion.div>
            )}

            {currentView === 'calendar' && (
              <motion.div
                key="calendar-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="px-6 md:px-8 w-[1200px] mx-auto h-[calc(100vh-210px)] min-h-[650px] overflow-hidden"
              >
              <CalendarView 
                filteredTasks={filteredTasks}
                onClick={handleTaskClick}
                onUpdateTask={handleUpdateTask}
              />
              </motion.div>
            )}
          </AnimatePresence>
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
