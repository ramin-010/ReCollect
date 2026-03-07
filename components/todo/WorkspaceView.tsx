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
import { WorkspaceSettingsModal } from './workspace/settings';
import { TaskDetailModal } from './workspace/modals/TaskDetailModal';

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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SubTab>('tasks');
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [overviewInputExpanded, setOverviewInputExpanded] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [editingTask, setEditingTask] = useState<any | null>(null);

  // Create workspace
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('Team 1');
  const [isCreating, setIsCreating] = useState(false);

  // Create Space within Workspace
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [newSpaceInput, setNewSpaceInput] = useState('');
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);

  // Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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

  const isOwner = selectedWorkspace?.owner._id === currentUser?._id;
  const isAdmin = isOwner || selectedWorkspace?.members.some(
    m => m.user._id === currentUser?._id && m.role === 'admin'
  ) || false;

  // Overview permission check
  const canViewOverview = useMemo(() => {
    if (!selectedWorkspace) return false;
    if (isAdmin || isOwner) return true;
    return !!selectedWorkspace.settings?.membersCanViewOverview;
  }, [selectedWorkspace, isAdmin, isOwner]);


  // ── Fetch workspaces ──
  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await workspaceApi.getWorkspaces();
      if (res.success) {
        setWorkspaces(res.data);
        if (!selectedWorkspace && res.data.length > 0) {
          const firstWorkspace = res.data[0];
          setSelectedWorkspace(firstWorkspace);
          if (firstWorkspace.spaces && firstWorkspace.spaces.length > 0) {
            setActiveSpaceId(firstWorkspace.spaces[0]._id);
          }
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
        const fetches: Promise<any>[] = [
          workspaceApi.getWorkspaceActivity(wsId),
          workspaceApi.getWorkspaceTasks(wsId, activeSpaceId !== 'all' ? activeSpaceId! : undefined),
        ];

        if (canViewOverview) {
          fetches.push(workspaceApi.getWorkspaceStats(wsId, activeSpaceId !== 'all' ? activeSpaceId! : undefined));
        }

        const results = await Promise.all(fetches);
        
        if (results[0].success) setActivity(results[0].data);
        if (results[1].success) setTasks(results[1].data);
        if (canViewOverview && results[2]?.success) setStats(results[2].data);
      } catch {
        // Silently fail
      } finally {
        setIsDataLoading(false);
      }
    };
    load();
  }, [selectedWorkspace?._id, activeSpaceId, canViewOverview]);

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
    if (selectedWorkspace && canViewOverview) {
      workspaceApi.getWorkspaceStats(selectedWorkspace._id)
        .then(res => res.success && setStats(res.data));
    }
  }, [selectedWorkspace, canViewOverview]);

  // ── Handlers ──
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task) return;
    const currentStatus = task.status;
    
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus as any } : t));
      
      const res = await todoApi.updateTodo(taskId, { status: newStatus as any });
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

  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, ...updates } : t));
      
      const res = await todoApi.updateTodo(taskId, updates);
      if (!res.success) {
        // We'd ideally revert here, but for simplicity of generic updates, we can just refetch or rely on toast
        toast.error('Failed to update task');
      }
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleTaskClick = (task: any) => {
    setEditingTask(task);
  };

  const handleCreate = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      setIsCreating(true);
      const res = await workspaceApi.createWorkspace(newWorkspaceName.trim(), newSpaceName.trim());
      if (res.success) {
        setWorkspaces(prev => [res.data, ...prev]);
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
        setWorkspaces(prev => prev.map(w => w._id === res.data._id ? res.data : w));
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
              placeholder="Workspace name…"
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
              autoFocus
            />
            <input
              type="text"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Default Space Name (e.g. Team 1)"
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
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
  const activeSpace = selectedWorkspace?.spaces?.find((s: any) => s._id === activeSpaceId);

  return (
    <div className="min-h-screen text-white bg-[hsl(var(--background))] pb-20 selection:bg-indigo-500/30">
      <div className="max-w-[1250px] mx-auto px-6 md:px-8 pt-8">

        {/* ── Header: Workspace & Space Switchers (Breadcrumb style) ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1.5 text-xl font-bold bg-white/[0.02] px-3 py-1.5 rounded-xl border border-white/5">
            {/* Workspace Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 text-white/90 hover:text-white transition-colors group outline-none focus:outline-none bg-transparent">
                  <div className="flex items-center justify-center bg-indigo-500/10 p-1.5 rounded-lg">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span>{selectedWorkspace?.name}</span>
                  <ChevronDown className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[220px] bg-[#1E1E1E] border-white/10 shadow-xl rounded-xl p-1 z-50">
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/25">Workspaces</span>
                </div>
                {workspaces.map(ws => (
                  <DropdownMenuItem
                    key={ws._id}
                    onClick={() => { 
                      setSelectedWorkspace(ws); 
                      if (ws.spaces && ws.spaces.length > 0) {
                        setActiveSpaceId(ws.spaces[0]._id);
                      } else {
                        setActiveSpaceId('all');
                      }
                      setActiveTab('tasks'); 
                      setTaskFilter('all'); 
                    }}
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

            <span className="text-white/20 font-light mx-1">/</span>

            {/* Space Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group outline-none focus:outline-none bg-transparent">
                  {activeSpace?.name || 'All Spaces'}
                  <ChevronDown className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] bg-[#1E1E1E] border-white/10 shadow-xl rounded-xl p-1 z-50">
                <div className="px-2 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/25">Spaces</span>
                </div>
                {selectedWorkspace?.spaces?.map(space => (
                  <DropdownMenuItem
                    key={space._id}
                    onClick={() => setActiveSpaceId(space._id)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors !outline-none text-sm",
                      activeSpaceId === space._id ? "bg-white/5 text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white/80"
                    )}
                  >
                    <span className="truncate">{space.name}</span>
                  </DropdownMenuItem>
                ))}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-white/5 my-1" />
                    {showCreateSpace ? (
                      <div className="flex items-center gap-1.5 px-2 py-1.5">
                        <input
                          type="text"
                          value={newSpaceInput}
                          onChange={(e) => setNewSpaceInput(e.target.value)}
                          onKeyDown={(e) => {
                            // Don't close the dropdown on space
                            e.stopPropagation();
                            if (e.key === 'Enter') handleCreateSpace();
                          }}
                          onClick={(e) => e.stopPropagation()} // Keep dropdown open when typing
                          placeholder="Space name"
                          className="flex-1 min-w-0 bg-white/[0.05] border border-white/10 rounded-md text-xs text-white placeholder-white/30 px-2 py-1 outline-none focus:border-white/20"
                          autoFocus
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCreateSpace(); }}
                          disabled={!newSpaceInput.trim() || isCreatingSpace}
                          className="p-1 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                        >
                          {isCreatingSpace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowCreateSpace(false); setNewSpaceInput(''); }}
                          className="p-1 text-white/40 hover:text-white/70 bg-transparent rounded transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <DropdownMenuItem
                        onClick={(e) => { e.preventDefault(); setShowCreateSpace(true); }}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 !outline-none"
                      >
                        <Plus className="w-3.5 h-3.5" /> New Space
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Breadcrumb Info Extra */}
            <div className="ml-3 pl-3 border-l border-white/5 flex items-center gap-2 text-[11px] font-medium text-white/30 tracking-wide uppercase">
              <Users className="w-3.5 h-3.5" />
              <span>{selectedWorkspace?.members.length} member{selectedWorkspace?.members.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Actions — Invite (ghost outline) vs Delete (very muted) */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => { setShowSettingsModal(true); setIsInviting(true); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white/45 border border-white/8 hover:text-white/75 hover:border-white/15 hover:bg-white/[0.03] rounded-lg transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite
              </button>
            )}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 text-white/45 hover:text-white/75 hover:bg-white/[0.03] rounded-lg transition-colors outline-none"
              title="Workspace Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Settings Modal ── */}
        <div className='max-w-[1000px] mx-auto'>
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
           onDeleteWorkspace={handleDeleteWorkspace}
        />

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

        {/* ── Create Workspace Inline ── */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex flex-col gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl mt-3">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name…"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg text-sm text-white placeholder-white/25 outline-none px-3 py-2 focus:border-white/20"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="First space (e.g. Team 1)"
                    className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg text-sm text-white placeholder-white/25 outline-none px-3 py-2 focus:border-white/20"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!newWorkspaceName.trim() || isCreating}
                    className="px-4 py-2 text-xs font-medium text-black bg-white hover:bg-white/90 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                  >
                    {isCreating ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Create'}
                  </button>
                  <button onClick={() => setShowCreateForm(false)} className="p-2 text-white/30 hover:text-white/60">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



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
                activeSpaceId={activeSpaceId}
              />
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── TASKS TAB ─── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'tasks' && selectedWorkspace && (
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
                handleTaskSaved={handleTaskSaved}
                handleStatusChange={handleStatusChange}
                handleUpdateTask={handleUpdateTask}
                handleTaskClick={handleTaskClick}
                activeSpaceId={activeSpaceId}
              />
            )}

          </motion.div>
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
