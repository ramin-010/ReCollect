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
  WorkspaceStats as WorkspaceStatsApi,
  ActivityLogEntry as ActivityLogEntryApi
} from '@/lib/api/workspaceApi';
import { todoApi } from '@/lib/api/todoApi';
import { useAuthStore } from '@/lib/store/authStore';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui-base/DropdownMenu';
import { isPast, isToday, parseISO, format } from 'date-fns';
import { isOverdue, isDueToday } from './workspace/utils';
import { WorkspaceStats, ActivityLogEntry } from './workspace/types';
import { OverviewTab } from './workspace/OverviewTab';
import { TasksTab } from './workspace/TasksTab';
import { MembersTab } from './workspace/MembersTab';

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
  const unassignedTasks = useMemo(() => tasks.filter(t => (!t.assignees || t.assignees.length === 0) && t.status !== 'complete'), [tasks]);

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

  // ── Flat workspace members for assignee picker (exclude self) ──
  const workspaceMembers = useMemo(() => {
    if (!selectedWorkspace) return [];
    const members = selectedWorkspace.members
      .filter(m => m.user._id !== currentUser?._id)
      .map(m => ({ _id: m.user._id, name: m.user.name, email: m.user.email, avatar: m.user.avatar }));
    // Include owner if not self
    if (selectedWorkspace.owner._id !== currentUser?._id) {
      members.unshift({
        _id: selectedWorkspace.owner._id,
        name: selectedWorkspace.owner.name,
        email: selectedWorkspace.owner.email,
        avatar: selectedWorkspace.owner.avatar,
      });
    }
    return members;
  }, [selectedWorkspace, currentUser?._id]);

  // ── Filtered tasks for Tasks tab ──
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    switch (taskFilter) {
      case 'mine':
        result = result.filter(t => {
          return t.assignees?.some((a: any) => {
            const assigneeId = typeof a === 'object' ? a._id : a;
            return assigneeId === currentUser?._id;
          });
        });
        break;
      case 'unassigned':
        result = result.filter(t => !t.assignees || t.assignees.length === 0);
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
  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'complete' ? 'pending' : 'complete';
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      
      const res = await todoApi.updateTodo(taskId, { status: newStatus });
      if (!res.success) {
        // Revert on failure
        setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: currentStatus } : t));
        toast.error('Failed to update task status');
      }
    } catch {
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: currentStatus } : t));
      toast.error('Failed to update task status');
    }
  };

  const handleTaskClick = (task: any) => {
    // Navigate to the main task dashboard and open this specific task
    window.location.href = `/dashboard?view=todos&task=${task._id}`;
  };

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
        setInviteEmail('');
        setIsInviting(false);
        toast.success(res.message || 'Invite sent!');
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
  ) || false;

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-62">
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
            {activeTab === 'overview' && selectedWorkspace && (
              <OverviewTab
                selectedWorkspace={selectedWorkspace}
                workspaceMembers={workspaceMembers}
                overdueTasks={overdueTasks}
                dueTodayTasks={dueTodayTasks}
                unassignedTasks={unassignedTasks}
                needsAttentionTasks={needsAttentionTasks}
                recentlyUpdatedTasks={recentlyUpdatedTasks}
                activity={activity}
                isDataLoading={isDataLoading}
                overviewInputExpanded={overviewInputExpanded}
                setOverviewInputExpanded={setOverviewInputExpanded}
                handleTaskSaved={handleTaskSaved}
              />
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── TASKS TAB ─── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'tasks' && selectedWorkspace && (
              <TasksTab
                selectedWorkspace={selectedWorkspace}
                workspaceMembers={workspaceMembers}
                filteredTasks={filteredTasks}
                isDataLoading={isDataLoading}
                isInputExpanded={isInputExpanded}
                setIsInputExpanded={setIsInputExpanded}
                taskFilter={taskFilter}
                setTaskFilter={(f) => setTaskFilter(f as TaskFilter)}
                handleTaskSaved={handleTaskSaved}
                handleToggleTaskStatus={handleToggleTaskStatus}
                handleTaskClick={handleTaskClick}
              />
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── MEMBERS TAB ─── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'members' && selectedWorkspace && (
              <MembersTab
                selectedWorkspace={selectedWorkspace}
                currentUser={currentUser}
                isAdmin={isAdmin ?? false}
                isInviting={isInviting}
                setIsInviting={setIsInviting}
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                isInviteLoading={isInviteLoading}
                handleInvite={handleInvite}
                handleRemoveMember={handleRemoveMember}
              />
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
