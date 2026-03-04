'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Briefcase,
  UserPlus,
  Users,
  Trash2,
  X,
  Loader2,
  Mail,
  Crown,
  LogOut,
  ChevronDown,
  ListTodo,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  CircleDot,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  workspaceApi,
  Workspace,
  WorkspaceStats,
  ActivityLogEntry,
} from '@/lib/api/workspaceApi';
import { useAuthStore } from '@/lib/store/authStore';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui-base/DropdownMenu';
import { formatDistanceToNow, isPast, isToday, parseISO, format } from 'date-fns';
import { TaskInput } from './task_Input';

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────
type SubTab = 'overview' | 'tasks' | 'members';
type TaskFilter = 'all' | 'mine' | 'unassigned' | 'completed';

// Text-only sub-tabs (no icons — cleaner)
const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'members', label: 'Members' },
];

const TASK_FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Assigned to me' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'completed', label: 'Completed' },
];

// ────────────────────────────────────────────────────────
// Activity helpers
// ────────────────────────────────────────────────────────
function activityLabel(entry: ActivityLogEntry): string {
  const actor = entry.actor?.name || 'Someone';
  const target = entry.targetUser?.name || '';
  switch (entry.action) {
    case 'workspace_created': return `${actor} created this workspace`;
    case 'member_joined': return `${actor} added ${target}`;
    case 'member_removed': return `${actor} removed ${target}`;
    case 'task_created': return `${actor} created "${entry.metadata}"`;
    case 'task_completed': return `${actor} completed "${entry.metadata}"`;
    case 'task_assigned': return `${actor} assigned "${entry.metadata}" to ${target}`;
    case 'task_status_changed': return `${actor} changed status: ${entry.metadata}`;
    default: return `${actor} performed an action`;
  }
}

function activityIcon(action: ActivityLogEntry['action']) {
  const base = "w-3.5 h-3.5";
  switch (action) {
    case 'task_created': return <Plus className={cn(base, "text-emerald-400")} />;
    case 'task_completed': return <CheckCircle2 className={cn(base, "text-emerald-400")} />;
    case 'task_assigned': return <UserPlus className={cn(base, "text-sky-400")} />;
    case 'task_status_changed': return <ArrowRight className={cn(base, "text-amber-400")} />;
    case 'member_joined': return <UserPlus className={cn(base, "text-indigo-400")} />;
    case 'member_removed': return <LogOut className={cn(base, "text-rose-400")} />;
    case 'workspace_created': return <Briefcase className={cn(base, "text-indigo-400")} />;
    default: return <CircleDot className={cn(base, "text-white/40")} />;
  }
}

// ────────────────────────────────────────────────────────
// Task helpers
// ────────────────────────────────────────────────────────
function formatDueDate(dateStr: string | undefined) {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    return format(d, 'MMM d');
  } catch { return null; }
}

function isOverdue(task: any): boolean {
  if (!task.dueDate || task.status === 'complete') return false;
  try {
    const d = parseISO(task.dueDate);
    return isPast(d) && !isToday(d);
  } catch { return false; }
}

function isDueToday(task: any): boolean {
  if (!task.dueDate || task.status === 'complete') return false;
  try { return isToday(parseISO(task.dueDate)); } catch { return false; }
}

// ────────────────────────────────────────────────────────
// Task Row Component (columnar)
// ────────────────────────────────────────────────────────
function TaskRow({ task }: { task: any }) {
  const dueDateStr = formatDueDate(task.dueDate);
  const overdue = isOverdue(task);
  const isDone = task.status === 'complete';

  return (
    <div className="grid grid-cols-[1fr_120px_100px_80px_60px] items-center gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors">
      {/* Task title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          isDone ? "bg-emerald-400" :
          task.status === 'in_progress' ? "bg-sky-400" :
          "bg-white/15"
        )} />
        <p className={cn(
          "text-sm truncate",
          isDone ? "text-white/30 line-through" : "text-white/70"
        )}>
          {task.title}
        </p>
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-2 min-w-0">
        {task.assignee ? (
          <>
            <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
              {task.assignee.avatar ? (
                <img src={task.assignee.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-[8px] font-bold text-white/40">{task.assignee.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-xs text-white/40 truncate">{task.assignee.name}</span>
          </>
        ) : (
          <span className="text-xs text-white/15 italic">Unassigned</span>
        )}
      </div>

      {/* Status */}
      <span className={cn(
        "text-[10px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap w-fit",
        isDone ? "text-emerald-400/70 bg-emerald-500/8" :
        task.status === 'in_progress' ? "text-sky-400/70 bg-sky-500/8" :
        "text-white/20 bg-white/[0.03]"
      )}>
        {isDone ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'Todo'}
      </span>

      {/* Due date */}
      <span className={cn(
        "text-[11px] whitespace-nowrap",
        overdue ? "text-rose-400 font-medium" :
        dueDateStr === 'Today' ? "text-amber-400" :
        "text-white/20"
      )}>
        {dueDateStr || '–'}
      </span>

      {/* Priority */}
      {task.priority ? (
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-fit",
          task.priority === 'high' ? "text-rose-400/70 bg-rose-500/8" :
          task.priority === 'low' ? "text-blue-400/50 bg-blue-500/8" :
          "text-white/15"
        )}>
          {task.priority === 'medium' ? 'Med' : task.priority}
        </span>
      ) : <span />}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────
export function WorkspaceView() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [overviewInputExpanded, setOverviewInputExpanded] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');

  // Create workspace
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Invite
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteLoading, setIsInviteLoading] = useState(false);

  // Data — fetched upfront for selected workspace
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const currentUser = useAuthStore((state) => state.user);

  // ── Fetch workspaces ──
  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await workspaceApi.getWorkspaces();
      if (res.success) {
        setWorkspaces(res.data);
        if (!selectedWorkspace && res.data.length > 0) {
          setSelectedWorkspace(res.data[0]);
        }
      }
    } catch {
      toast.error('Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  // ── Fetch ALL workspace data upfront ──
  useEffect(() => {
    if (!selectedWorkspace) return;
    const wsId = selectedWorkspace._id;
    const load = async () => {
      setIsDataLoading(true);
      if(true ) { setIsDataLoading(false); return ;}
      try {
        const [statsRes, activityRes, tasksRes] = await Promise.all([
          workspaceApi.getWorkspaceStats(wsId),
          workspaceApi.getWorkspaceActivity(wsId),
          workspaceApi.getWorkspaceTasks(wsId),
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (activityRes.success) setActivity(activityRes.data);
        if (tasksRes.success) setTasks(tasksRes.data);
      } catch {
        // Silently fail
      } finally {
        setIsDataLoading(false);
      }
    };
    load();
  }, [selectedWorkspace?._id]);

  // ── Derived counts for actionable stats ──
  const overdueTasks = useMemo(() => tasks.filter(t => isOverdue(t)), [tasks]);
  const dueTodayTasks = useMemo(() => tasks.filter(t => isDueToday(t)), [tasks]);
  const unassignedTasks = useMemo(() => tasks.filter(t => !t.assignee && t.status !== 'complete'), [tasks]);

  const needsAttentionTasks = useMemo(() => {
    const combined = [...overdueTasks, ...unassignedTasks.filter(t => !isOverdue(t))];
    return combined.slice(0, 5);
  }, [overdueTasks, unassignedTasks]);

  const recentlyUpdatedTasks = useMemo(() =>
    [...tasks]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 5),
    [tasks]
  );

  // ── Filtered tasks for Tasks tab ──
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    switch (taskFilter) {
      case 'mine':
        result = result.filter(t => {
          const assigneeId = typeof t.assignee === 'object' ? t.assignee?._id : t.assignee;
          return assigneeId === currentUser?._id;
        });
        break;
      case 'unassigned':
        result = result.filter(t => !t.assignee);
        break;
      case 'completed':
        result = result.filter(t => t.status === 'complete');
        break;
      default:
        result = result.filter(t => t.status !== 'complete');
        break;
    }
    const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
    result.sort((a, b) => {
      const aOverdue = isOverdue(a) ? 1 : 0;
      const bOverdue = isOverdue(b) ? 1 : 0;
      if (bOverdue !== aOverdue) return bOverdue - aOverdue;
      return (pMap[b.priority || 'medium'] || 2) - (pMap[a.priority || 'medium'] || 2);
    });
    return result;
  }, [tasks, taskFilter, currentUser?._id]);

  // ── Task save handler (shared by Overview + Tasks quick-add) ──
  const handleTaskSaved = useCallback((newTask: any) => {
    setTasks(prev => [newTask, ...prev]);
    if (selectedWorkspace) {
      workspaceApi.getWorkspaceStats(selectedWorkspace._id)
        .then(res => res.success && setStats(res.data));
    }
  }, [selectedWorkspace]);

  // ── Handlers ──
  const handleCreate = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      setIsCreating(true);
      const res = await workspaceApi.createWorkspace(newWorkspaceName.trim());
      if (res.success) {
        setWorkspaces(prev => [res.data, ...prev]);
        setSelectedWorkspace(res.data);
        setNewWorkspaceName('');
        setShowCreateForm(false);
        toast.success('Workspace created!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedWorkspace) return;
    try {
      setIsInviteLoading(true);
      const res = await workspaceApi.inviteMember(selectedWorkspace._id, inviteEmail.trim());
      if (res.success) {
        setSelectedWorkspace(res.data);
        setWorkspaces(prev => prev.map(w => w._id === res.data._id ? res.data : w));
        setInviteEmail('');
        setIsInviting(false);
        toast.success(res.message || 'Member invited!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setIsInviteLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedWorkspace) return;
    try {
      const res = await workspaceApi.removeMember(selectedWorkspace._id, memberId);
      if (res.success) {
        setSelectedWorkspace(res.data);
        setWorkspaces(prev => prev.map(w => w._id === res.data._id ? res.data : w));
        toast.success('Member removed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspace) return;
    try {
      const res = await workspaceApi.deleteWorkspace(selectedWorkspace._id);
      if (res.success) {
        const remaining = workspaces.filter(w => w._id !== selectedWorkspace._id);
        setWorkspaces(remaining);
        setSelectedWorkspace(remaining[0] || null);
        toast.success('Workspace deleted');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  const isOwner = selectedWorkspace?.owner._id === currentUser?._id;
  const isAdmin = isOwner || selectedWorkspace?.members.some(
    m => m.user._id === currentUser?._id && m.role === 'admin'
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-white/20" />
      </div>
    );
  }

  // ── Empty State ──
  if (workspaces.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-5">
            <Users className="w-7 h-7 text-white/30" />
          </div>
          <h2 className="text-lg font-semibold text-white/80 mb-1.5">No workspaces yet</h2>
          <p className="text-sm text-white/35 leading-relaxed mb-6">
            Create a workspace to start collaborating on tasks with your team.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Workspace name…"
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={!newWorkspaceName.trim() || isCreating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Workspace'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // Main Layout — No AppNavbar. Workspace switcher IS the header.
  // ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white bg-[#171717] pb-20 selection:bg-indigo-500/30">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-10">

        {/* ── Header: Workspace Switcher (promoted to primary) ── */}
        <div className="flex items-center justify-between mb-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 group outline-none py-1">
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/8 flex items-center justify-center text-sm font-bold text-white/60">
                  {selectedWorkspace?.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <span className="text-lg font-semibold text-white/90 group-hover:text-white transition-colors flex items-center gap-2">
                    {selectedWorkspace?.name}
                    <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-white/45 transition-colors" />
                  </span>
                  <span className="text-[11px] text-white/25 block -mt-0.5">
                    {selectedWorkspace?.members.length} member{selectedWorkspace?.members.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px] bg-[#1E1E1E] border-white/10 shadow-xl rounded-xl p-1 z-50">
              <div className="px-2 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/25">Workspaces</span>
              </div>
              {workspaces.map(ws => (
                <DropdownMenuItem
                  key={ws._id}
                  onClick={() => { setSelectedWorkspace(ws); setActiveTab('overview'); setTaskFilter('all'); }}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors !outline-none text-sm",
                    selectedWorkspace?._id === ws._id ? "bg-white/5 text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white/80"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold",
                    selectedWorkspace?._id === ws._id ? "bg-white/10 text-white/70" : "bg-white/[0.04] text-white/40"
                  )}>
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{ws.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-white/5 my-1" />
              <DropdownMenuItem
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/70 !outline-none"
              >
                <Plus className="w-3.5 h-3.5" /> New Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Actions — Invite (ghost outline) vs Delete (very muted) */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => { setActiveTab('members'); setIsInviting(true); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white/45 border border-white/8 hover:text-white/75 hover:border-white/15 hover:bg-white/[0.03] rounded-lg transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleDeleteWorkspace}
                className="p-1.5 text-white/15 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Delete workspace"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Create Workspace Inline ── */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl mt-3">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Workspace name…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none px-2"
                  autoFocus
                />
                <button
                  onClick={handleCreate}
                  disabled={!newWorkspaceName.trim() || isCreating}
                  className="px-3.5 py-1.5 text-xs font-medium text-black bg-white hover:bg-white/90 rounded-lg transition-colors disabled:opacity-40"
                >
                  {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                </button>
                <button onClick={() => setShowCreateForm(false)} className="p-1 text-white/30 hover:text-white/60">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Sub-Tabs (text-only, no icons) ── */}
        <div className="flex items-center gap-0.5 border-b border-white/[0.05] mb-6 mt-4">
          {SUB_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.key
                  ? "border-white/60 text-white/90"
                  : "border-transparent text-white/30 hover:text-white/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedWorkspace?._id}-${activeTab}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── OVERVIEW TAB ─── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <div className="space-y-7">

                {/* Quick-add bar — always visible on Overview */}
                <div className='max-w-[800px] mx-auto'>
                {selectedWorkspace && (
                  <TaskInput
                    isExpanded={overviewInputExpanded}
                    onExpandChange={setOverviewInputExpanded}
                    workspaceId={selectedWorkspace._id}
                    visibility="workspace"
                    onSave={handleTaskSaved}
                  />
                )}
                </div>
                {/* Actionable Stats: Overdue / Due Today / Unassigned */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Overdue',
                      value: overdueTasks.length,
                      hasValue: overdueTasks.length > 0,
                      activeColor: 'text-rose-400',
                      activeBorder: 'border-rose-500/15',
                      emptyMsg: 'All caught up',
                    },
                    {
                      label: 'Due Today',
                      value: dueTodayTasks.length,
                      hasValue: dueTodayTasks.length > 0,
                      activeColor: 'text-amber-400',
                      activeBorder: 'border-amber-500/15',
                      emptyMsg: 'Nothing due',
                    },
                    {
                      label: 'Unassigned',
                      value: unassignedTasks.length,
                      hasValue: unassignedTasks.length > 0,
                      activeColor: 'text-sky-400',
                      activeBorder: 'border-sky-500/15',
                      emptyMsg: 'All assigned',
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={cn(
                        "rounded-xl border px-4 py-3.5 transition-colors",
                        s.hasValue
                          ? cn("bg-white/[0.03]", s.activeBorder)
                          : "bg-white/[0.02] border-white/[0.04] opacity-60"
                      )}
                    >
                      {s.hasValue ? (
                        <>
                          <p className={cn("text-2xl font-bold tracking-tight", s.activeColor)}>{s.value}</p>
                          <p className="text-[11px] text-white/30 font-medium mt-0.5">{s.label}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-semibold text-white/25">–</p>
                          <p className="text-[11px] text-white/20 font-medium mt-0.5">{s.emptyMsg}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Two-column: Needs Attention + Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* LEFT: Needs Attention */}
                  <div>
                    <h3 className="text-[11px] font-bold text-white/25 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-amber-400/50" />
                      Needs Attention
                    </h3>
                    {isDataLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-4 h-4 animate-spin text-white/15" />
                      </div>
                    ) : needsAttentionTasks.length === 0 ? (
                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] py-10 text-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400/30 mx-auto mb-2" />
                        <p className="text-xs text-white/20">All clear — nothing needs attention</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] divide-y divide-white/[0.03] overflow-hidden">
                        {needsAttentionTasks.map(task => (
                          <div key={task._id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              isOverdue(task) ? "bg-rose-400" : "bg-amber-400"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/60 truncate">{task.title}</p>
                              <p className="text-[10px] text-white/20 mt-0.5">
                                {isOverdue(task) ? (
                                  <span className="text-rose-400/60">Overdue · {formatDueDate(task.dueDate)}</span>
                                ) : (
                                  <span className="text-amber-400/50">Unassigned</span>
                                )}
                              </p>
                            </div>
                            {task.priority === 'high' && (
                              <span className="text-[8px] font-bold text-rose-400/50 bg-rose-500/8 px-1.5 py-0.5 rounded uppercase">High</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Recent Activity (more breathing room) */}
                  <div>
                    <h3 className="text-[11px] font-bold text-white/25 uppercase tracking-wider mb-3">Recent Activity</h3>
                    {isDataLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-4 h-4 animate-spin text-white/15" />
                      </div>
                    ) : activity.length === 0 ? (
                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] h-32 py-14 text-center flex item-center justify-center">
                        <p className="text-xs text-white/20">No activity yet</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {activity.slice(0, 8).map((entry) => (
                          <div key={entry._id} className="flex items-start gap-3 px-3 py-3.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                            <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0 mt-0.5">
                              {activityIcon(entry.action)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-white/50 leading-relaxed">{activityLabel(entry)}</p>
                              <p className="text-[11px] text-white/15 mt-1">
                                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recently Updated */}
                {recentlyUpdatedTasks.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-white/25 uppercase tracking-wider mb-3">Recently Updated</h3>
                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] divide-y divide-white/[0.03] overflow-hidden">
                      {recentlyUpdatedTasks.map(task => (
                        <div key={task._id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            task.status === 'complete' ? "bg-emerald-400" :
                            task.status === 'in_progress' ? "bg-sky-400" :
                            "bg-white/15"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm truncate", task.status === 'complete' ? "text-white/25 line-through" : "text-white/60")}>
                              {task.title}
                            </p>
                          </div>
                          {task.assignee && (
                            <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0" title={task.assignee.name}>
                              <span className="text-[8px] font-bold text-white/30">{task.assignee.name?.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <span className="text-[10px] text-white/15 whitespace-nowrap">
                            {formatDistanceToNow(new Date(task.updatedAt || task.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── TASKS TAB ─── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'tasks' && (
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
                    {/* Column Header */}
                    <div className="grid grid-cols-[1fr_120px_100px_80px_60px] items-center gap-2 px-4 py-2 border-b border-white/[0.04]">
                      <span className="text-[10px] font-bold text-white/15 uppercase tracking-wider">Task</span>
                      <span className="text-[10px] font-bold text-white/15 uppercase tracking-wider">Assignee</span>
                      <span className="text-[10px] font-bold text-white/15 uppercase tracking-wider">Status</span>
                      <span className="text-[10px] font-bold text-white/15 uppercase tracking-wider">Due</span>
                      <span className="text-[10px] font-bold text-white/15 uppercase tracking-wider">Priority</span>
                    </div>
                    <div className="divide-y divide-white/[0.025]">
                      {filteredTasks.map((task) => (
                        <TaskRow key={task._id} task={task} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── MEMBERS TAB ─── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'members' && selectedWorkspace && (
              <div className="space-y-4">
                <AnimatePresence>
                  {isInviting && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 p-3 bg-white/[0.02] rounded-xl border border-white/5 mb-4">
                        <Mail className="w-4 h-4 text-white/25 shrink-0" />
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                          placeholder="Email address…"
                          className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
                          autoFocus
                        />
                        <button
                          onClick={handleInvite}
                          disabled={!inviteEmail.trim() || isInviteLoading}
                          className="px-3.5 py-1.5 text-xs font-medium text-black bg-white hover:bg-white/90 rounded-lg transition-colors disabled:opacity-40"
                        >
                          {isInviteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Send'}
                        </button>
                        <button
                          onClick={() => { setIsInviting(false); setInviteEmail(''); }}
                          className="p-1 text-white/30 hover:text-white/60"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isAdmin && !isInviting && (
                  <button
                    onClick={() => setIsInviting(true)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white/30 bg-white/[0.01] border border-dashed border-white/8 rounded-xl hover:bg-white/[0.03] hover:text-white/45 hover:border-white/15 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite a team member
                  </button>
                )}

                <div className="bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/[0.03]">
                  {selectedWorkspace.members.map((member) => {
                    const isCurrentUser = member.user._id === currentUser?._id;
                    const memberIsOwner = member.user._id === selectedWorkspace.owner._id;

                    return (
                      <div
                        key={member.user._id}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.015] transition-colors group"
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          memberIsOwner
                            ? "bg-amber-500/12 text-amber-400"
                            : member.role === 'admin'
                            ? "bg-indigo-500/12 text-indigo-400"
                            : "bg-white/[0.05] text-white/40"
                        )}>
                          {member.user.avatar ? (
                            <img src={member.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            member.user.name.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/70 font-medium truncate">{member.user.name}</span>
                            {memberIsOwner && (
                              <span className="flex items-center gap-0.5 text-[9px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                <Crown className="w-2.5 h-2.5" /> Owner
                              </span>
                            )}
                            {member.role === 'admin' && !memberIsOwner && (
                              <span className="text-[9px] text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>
                            )}
                            {isCurrentUser && (
                              <span className="text-[10px] text-white/15">(you)</span>
                            )}
                          </div>
                          <p className="text-xs text-white/20 truncate">{member.user.email}</p>
                        </div>

                        {isAdmin && !memberIsOwner && !isCurrentUser && (
                          <button
                            onClick={() => handleRemoveMember(member.user._id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-white/15 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isCurrentUser && !memberIsOwner && (
                          <button
                            onClick={() => handleRemoveMember(member.user._id)}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white/15 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all"
                          >
                            <LogOut className="w-3 h-3" /> Leave
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
