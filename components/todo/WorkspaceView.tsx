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
  Settings,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import {
  workspaceApi,
  Workspace,
  WorkspaceStats as WorkspaceStatsApi,
  ActivityLogEntry as ActivityLogEntryApi
} from '@/lib/api/workspaceApi';
import { useAuthStore } from '@/lib/store/authStore';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
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
import { WorkspaceSettingsModal } from './workspace/settings';
import { TaskDetailModal } from './workspace/modals/TaskDetailModal';
import { PermissionModal } from './workspace/modals/PermissionModal';
import { ShareLinkModal } from './workspace/modals/ShareLinkModal';
import { WorkspaceHeader } from './workspace/WorkspaceHeader';
import { TaskInput } from './task_Input';

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────
type SubTab = 'overview' | 'tasks';
export type TaskFilter = 'all' | 'mine' | 'unassigned' | 'completed';

// We'll dynamically determine the tabs inside the component
// to check if the current user can see the Overview tab.
const BASE_SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
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
  const {
    workspaces, selectedWorkspace, activeSpaceId, tasks, stats, activity, isLoading, isDataLoading, dataVersion,
    setSelectedWorkspace, setActiveSpaceId, fetchWorkspaces, fetchWorkspaceData,
    updateTask, updateTaskImmediate, addTask, setWorkspaces, setStats, updateWorkspace, setActivity
  } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<SubTab>('tasks');
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [overviewInputExpanded, setOverviewInputExpanded] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'recent'>('priority');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Create workspace
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Create Space within Workspace
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [newSpaceInput, setNewSpaceInput] = useState('');
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);

  // Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Share Link Modal
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);

  // Invite
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteLoading, setIsInviteLoading] = useState(false);

  const currentUser = useAuthStore((state) => state.user);

  const isOwner = selectedWorkspace?.owner?._id === currentUser?._id;
  const isAdmin = isOwner || selectedWorkspace?.members?.some(
    (m: any) => m.user._id === currentUser?._id && m.role === 'admin'
  ) || false;

  const isViewer = selectedWorkspace?.members?.some(
    (m: any) => m.user._id === currentUser?._id && m.role === 'viewer'
  ) || false;
  const handleRemoveMember = async (userId: string) => {
    try {
      if (!selectedWorkspace) return;
      const res = await workspaceApi.removeMember(selectedWorkspace._id, userId);
      if (res.success) {
        setSelectedWorkspace(res.data);
        toast.success('Member removed successfully!');
      } else {
        toast.error(res.message || 'Failed to remove member');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleLeaveWorkspace = async () => {
    try {
      if (!selectedWorkspace || !currentUser) return;
      
      const res = await workspaceApi.removeMember(selectedWorkspace._id, currentUser._id || currentUser._id);
      if (res.success) {
        toast.success("You have left the workspace.");
        setShowSettingsModal(false);
        fetchWorkspaces();
        setSelectedWorkspace(null);
        setActiveSpaceId('all');
      } else {
        toast.error(res.message || 'Failed to leave workspace');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to leave workspace');
    }
  };

  // Overview permission check
  const canViewOverview = useMemo(() => {
    if (!selectedWorkspace) return false;
    if (isAdmin || isOwner) return true;
    return !!selectedWorkspace.settings?.membersCanViewOverview;
  }, [selectedWorkspace, isAdmin, isOwner]);


  // ── Fetch workspaces ──
  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  // ── Fetch ALL workspace data upfront ──
  useEffect(() => {
    if (!selectedWorkspace) return;
    fetchWorkspaceData(selectedWorkspace._id, activeSpaceId !== 'all' ? activeSpaceId! : undefined, canViewOverview);
    
    // Also fetch initial activity feed if overview is accessible
    if (canViewOverview) {
      workspaceApi.getWorkspaceActivity(selectedWorkspace._id)
        .then(res => res.success && setActivity(res.data));
    }
  }, [selectedWorkspace?._id, activeSpaceId, canViewOverview, fetchWorkspaceData, dataVersion]);

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

  // ── Flat workspace members for assignee picker ──
  const workspaceMembers = useMemo(() => {
    if (!selectedWorkspace) return [];
    
    // Create a unique array of members (owner is usually already in members)
    const membersMap = new Map();
    
    // Add owner explicitly just in case
    if (selectedWorkspace.owner) {
      membersMap.set(selectedWorkspace.owner._id, {
        _id: selectedWorkspace.owner._id,
        name: selectedWorkspace.owner.name,
        email: selectedWorkspace.owner.email,
        avatar: selectedWorkspace.owner.avatar,
        role: 'owner'
      });
    }

    // Add all members
    selectedWorkspace.members.forEach((m: any) => {
      if (m.user && !membersMap.has(m.user._id)) {
        membersMap.set(m.user._id, {
          _id: m.user._id,
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.avatar,
          role: m.role
        });
      }
    });

    return Array.from(membersMap.values());
  }, [selectedWorkspace]);

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

    // Apply Assignee filter
    if (assigneeFilter !== 'all') {
      result = result.filter(t => {
        return t.assignees?.some((a: any) => {
          const assigneeId = typeof a === 'object' ? a._id : a;
          return assigneeId === assigneeFilter;
        });
      });
    }

    // Apply Sorting
    if (sortBy === 'priority') {
      const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
      result.sort((a, b) => {
        const aOverdue = isOverdue(a) ? 1 : 0;
        const bOverdue = isOverdue(b) ? 1 : 0;
        if (bOverdue !== aOverdue) return bOverdue - aOverdue;
        return (pMap[b.priority || 'medium'] || 2) - (pMap[a.priority || 'medium'] || 2);
      });
    } else if (sortBy === 'dueDate') {
      result.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortBy === 'recent') {
      result.sort((a, b) => {
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return result;
  }, [tasks, taskFilter, currentUser?._id, assigneeFilter, sortBy]);

  // ── Task save handler (shared by Overview + Tasks quick-add) ──
  const handleTaskSaved = useCallback((newTask: any) => {
    addTask(newTask);
    if (selectedWorkspace) {
      if (canViewOverview) {
        workspaceApi.getWorkspaceStats(selectedWorkspace._id)
          .then(res => res.success && setStats(res.data));
      }
      workspaceApi.getWorkspaceActivity(selectedWorkspace._id)
        .then(res => res.success && setActivity(res.data));
    }
  }, [selectedWorkspace, canViewOverview, addTask, setStats, setActivity]);

  // ── Handlers ──
  const handleStatusChange = useCallback((taskId: string, newStatus: string) => {
    updateTask(taskId, { status: newStatus as any }, (msg) => setPermissionError(msg));
    if (selectedWorkspace) {
      setTimeout(() => {
        workspaceApi.getWorkspaceActivity(selectedWorkspace._id)
          .then(res => res.success && setActivity(res.data));
      }, 500);
    }
  }, [updateTask, selectedWorkspace, setActivity]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: any) => {
    const success = await updateTaskImmediate(taskId, updates, (msg) => setPermissionError(msg));
    if (success && selectedWorkspace) {
      // Small delay to ensure DB triggers/activity log creation are finished
      setTimeout(() => {
        workspaceApi.getWorkspaceActivity(selectedWorkspace._id)
          .then(res => res.success && setActivity(res.data));
      }, 500);
    }
  }, [updateTaskImmediate, selectedWorkspace, setActivity]);

  const handleTaskClick = (task: any) => {
    setEditingTask(task);
  };

  const handleCreate = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      setIsCreating(true);
      const res = await workspaceApi.createWorkspace(newWorkspaceName.trim(), newSpaceName.trim());
      if (res.success) {
        setWorkspaces([res.data, ...workspaces]);
        setSelectedWorkspace(res.data);
        if (res.data.spaces && res.data.spaces.length > 0) {
          setActiveSpaceId(res.data.spaces[0]._id);
        }
        setNewWorkspaceName('');
        setNewSpaceName('Team 1');
        setShowCreateForm(false);
        toast.success('Workspace created!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateSpace = async () => {
    if (!newSpaceInput.trim() || !selectedWorkspace) return;
    try {
      setIsCreatingSpace(true);
      const res = await workspaceApi.createWorkspaceSpace(selectedWorkspace._id, newSpaceInput.trim());
      if (res.success) {
        setWorkspaces(workspaces.map(w => w._id === res.data._id ? res.data : w));
        setSelectedWorkspace(res.data);
        // Automatically select the new space
        const newSpace = res.data.spaces?.find(s => s.name === newSpaceInput.trim());
        if (newSpace) setActiveSpaceId(newSpace._id);
        
        setNewSpaceInput('');
        setShowCreateSpace(false);
        toast.success('Space created!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create space');
    } finally {
      setIsCreatingSpace(false);
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



  const handleUpdateRole = async (memberId: string, role: string) => {
    if (!selectedWorkspace) return;
    try {
      const res = await workspaceApi.updateWorkspaceRole(selectedWorkspace._id, memberId, role);
      if (res.success) {
        setSelectedWorkspace(res.data);
        updateWorkspace(res.data._id, res.data);
        toast.success('Role updated');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update role');
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



  // Adjust default tab if Overview is not allowed and it was somehow set
  useEffect(() => {
    if (activeTab === 'overview' && !canViewOverview) {
      setActiveTab('tasks');
    }
  }, [canViewOverview, activeTab]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-62">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]/30" />
      </div>
    );
  }

  // ── Empty State ──
  if (workspaces.length === 0) {
    return (
      <div className="min-h-[80vh]  flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center mx-auto mb-5">
            <Users className="w-7 h-7 text-indigo-500/80" />
          </div>
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]/80 mb-1.5">No workspaces yet</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]/80 leading-relaxed mb-6">
            Create a workspace to start collaborating on tasks with your teams.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name…"
              className="w-full px-4 py-2.5 bg-[var(--surface-elevated)] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/60 outline-none focus:border-[hsl(var(--foreground))]/20 transition-colors"
              autoFocus
            />
            <input
              type="text"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Sub-Space Name (e.g. Dev Team, Marketing Team etc.)"
              className="w-full px-4 py-2.5 bg-[var(--surface-elevated)] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/60 outline-none focus:border-[hsl(var(--foreground))]/20 transition-colors"
            />
            <button
              onClick={handleCreate}
              disabled={!newWorkspaceName.trim() || isCreating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-medium rounded-xl hover:bg-[hsl(var(--foreground))]/90 transition-colors disabled:opacity-40"
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
  const activeSpace = selectedWorkspace?.spaces?.find((s: any) => s._id === activeSpaceId);

  return (
    <div className="min-h-screen text-[hsl(var(--foreground))] bg-[hsl(var(--background))] pb-20 selection:bg-indigo-500/30">
      
      {/* ── New Premium Header ── */}
      <WorkspaceHeader 
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        activeSpaceId={activeSpaceId}
        isAdmin={isAdmin ?? false}
        stats={stats}
        showCreateForm={showCreateForm}
        setShowCreateForm={setShowCreateForm}
        showCreateSpace={showCreateSpace}
        setShowCreateSpace={setShowCreateSpace}
        newWorkspaceName={newWorkspaceName}
        setNewWorkspaceName={setNewWorkspaceName}
        newSpaceName={newSpaceName}
        setNewSpaceName={setNewSpaceName}
        isCreating={isCreating}
        handleCreate={handleCreate}
        newSpaceInput={newSpaceInput}
        setNewSpaceInput={setNewSpaceInput}
        isCreatingSpace={isCreatingSpace}
        handleCreateSpace={handleCreateSpace}
        onWorkspaceSelect={(ws) => {
          setSelectedWorkspace(ws); 
          if (ws.spaces && ws.spaces.length > 0) {
            setActiveSpaceId(ws.spaces[0]._id);
          } else {
            setActiveSpaceId('all');
          }
          setActiveTab('tasks'); 
          setTaskFilter('all'); 
        }}
        onSpaceSelect={setActiveSpaceId}
        setShowSettingsModal={setShowSettingsModal}
        setIsInviting={setIsInviting}
        setShowShareLinkModal={setShowShareLinkModal}
      />

      {/* ── Main Content Area (Unconstrained width) ── */}
      <div className="w-full mt-6">

        {/* ── Constrained Inner Wrapper for Modals & Input ── */}
        <div className="max-w-[1000px] mx-auto px-6 md:px-8">
        {/* ── Settings Modal ── */}
        {selectedWorkspace && (
          <WorkspaceSettingsModal 
             isOpen={showSettingsModal} 
             onClose={() => setShowSettingsModal(false)} 
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
             handleUpdateRole={handleUpdateRole}
             onDeleteWorkspace={handleDeleteWorkspace}
             isOwner={selectedWorkspace?.owner?._id === currentUser?._id || selectedWorkspace?.owner === currentUser?._id}
             onLeaveWorkspace={handleLeaveWorkspace}
          />
        )}

        {/* ── Task Detail Modal ── */}
        {selectedWorkspace && (
          <TaskDetailModal
            task={editingTask}
            isOpen={!!editingTask}
            onClose={() => setEditingTask(null)}
            onUpdateTask={handleUpdateTask}
            workspaceMembers={workspaceMembers}
          />
        )}

        <PermissionModal 
          isOpen={!!permissionError} 
          onClose={() => setPermissionError(null)} 
          message={permissionError || ""} 
        />

        {/* ── Share Link Modal ── */}
        {selectedWorkspace && (
          <ShareLinkModal
            isOpen={showShareLinkModal}
            onClose={() => setShowShareLinkModal(false)}
            workspace={selectedWorkspace}
          />
        )}

        {/* ── Create Workspace Inline ── */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex flex-col gap-2 p-3 bg-[hsl(var(--muted))]/20 border border-[hsl(var(--border))] rounded-xl mt-3">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name…"
                  className="w-full bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none px-3 py-2 focus:border-[hsl(var(--border))]"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="First space (e.g. Team 1)"
                    className="flex-1 bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none px-3 py-2 focus:border-[hsl(var(--border))]"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!newWorkspaceName.trim() || isCreating}
                    className="px-4 py-2 text-xs font-medium text-[hsl(var(--background))] bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                  >
                    {isCreating ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Create'}
                  </button>
                  <button onClick={() => setShowCreateForm(false)} className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        {/* ── Inline Add Task Input Area ── */}
        {selectedWorkspace && !isViewer && (
          <div className="pt-2 pb-6">
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

        </div> {/* End Constrained Wrapper */}

        {/* ── Tab Content (May have local constraints) ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedWorkspace?._id}-${activeTab}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ 
              duration: 0.35, 
              ease: [0.22, 1, 0.36, 1],
              opacity: { duration: 0.25 }
            }}
            className="w-full"
          >

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── OVERVIEW TAB ─── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'overview' && selectedWorkspace && (
              <div className="max-w-[1000px] mx-auto px-6 md:px-8">
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
                  activeSpaceId={activeSpaceId}
                  isViewer={isViewer}
                />
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── TASKS TAB ─── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'tasks' && selectedWorkspace && (
              <div className="w-full">
                <TasksTab
                selectedWorkspace={selectedWorkspace}
                workspaceMembers={workspaceMembers}
                allTasks={tasks}
                filteredTasks={filteredTasks}
                currentUserId={currentUser?._id}
                isDataLoading={isDataLoading}
                isInputExpanded={isInputExpanded}
                setIsInputExpanded={setIsInputExpanded}
                taskFilter={taskFilter}
                setTaskFilter={(f) => setTaskFilter(f as TaskFilter)}
                sortBy={sortBy}
                setSortBy={setSortBy}
                assigneeFilter={assigneeFilter}
                setAssigneeFilter={setAssigneeFilter}
                handleTaskSaved={handleTaskSaved}
                handleStatusChange={handleStatusChange}
                handleUpdateTask={handleUpdateTask}
                handleTaskClick={handleTaskClick}
                activeSpaceId={activeSpaceId}
                isViewer={isViewer}
              />
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
