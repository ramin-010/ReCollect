'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Settings,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { workspaceApi, Workspace, WorkspaceMember } from '@/lib/api/workspaceApi';
import { useAuthStore } from '@/lib/store/authStore';

export function WorkspaceView() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create workspace state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Invite state
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteLoading, setIsInviteLoading] = useState(false);

  const currentUser = useAuthStore((state) => state.user);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white bg-[#1A1A1A] pb-20">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Workspaces</h1>
              <p className="text-sm text-white/40">Collaborate with your team on shared tasks</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all",
              showCreateForm
                ? "bg-white/5 text-white/60 border border-white/10"
                : "bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/25"
            )}
          >
            {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreateForm ? 'Cancel' : 'New Workspace'}
          </button>
        </div>

        {/* ── Create Workspace Form ── */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white/70 mb-3">Create Workspace</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Workspace name..."
                    className="flex-1 px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 outline-none focus:border-indigo-500/50 transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!newWorkspaceName.trim() || isCreating}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Layout: Workspace List + Detail ── */}
        {workspaces.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

            {/* Left: Workspace List */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider px-2 mb-2">
                Your Workspaces
              </p>
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  onClick={() => setSelectedWorkspace(ws)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group",
                    selectedWorkspace?._id === ws._id
                      ? "bg-indigo-500/10 border border-indigo-500/20"
                      : "bg-white/[0.02] border border-transparent hover:bg-white/5 hover:border-white/5"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                    selectedWorkspace?._id === ws._id
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-white/5 text-white/40"
                  )}>
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      selectedWorkspace?._id === ws._id ? "text-white" : "text-white/70"
                    )}>
                      {ws.name}
                    </p>
                    <p className="text-xs text-white/30">
                      {ws.members.length} member{ws.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    selectedWorkspace?._id === ws._id ? "text-indigo-400" : "text-white/15"
                  )} />
                </button>
              ))}
            </div>

            {/* Right: Selected Workspace Detail */}
            {selectedWorkspace && (
              <motion.div
                key={selectedWorkspace._id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* Workspace Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedWorkspace.name}</h2>
                    <p className="text-xs text-white/35 mt-0.5">
                      Created {new Date(selectedWorkspace.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => setIsInviting(!isInviting)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Invite
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={handleDeleteWorkspace}
                        className="flex items-center gap-1 px-2.5 py-2 text-xs text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Invite Input */}
                <AnimatePresence>
                  {isInviting && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-4 bg-white/[0.03] rounded-xl border border-white/5">
                        <Mail className="w-4 h-4 text-white/30 shrink-0" />
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                          placeholder="Enter email to invite..."
                          className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                          autoFocus
                        />
                        <button
                          onClick={handleInvite}
                          disabled={!inviteEmail.trim() || isInviteLoading}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-40"
                        >
                          {isInviteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Send Invite'}
                        </button>
                        <button
                          onClick={() => { setIsInviting(false); setInviteEmail(''); }}
                          className="p-1.5 text-white/30 hover:text-white/60 rounded-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Members */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-white/40" />
                      <h3 className="text-sm font-semibold text-white/60">Members</h3>
                      <span className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded-md font-medium">
                        {selectedWorkspace.members.length}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-white/[0.03]">
                    {selectedWorkspace.members.map((member) => {
                      const isCurrentUser = member.user._id === currentUser?._id;
                      const memberIsOwner = member.user._id === selectedWorkspace.owner._id;

                      return (
                        <div
                          key={member.user._id}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Avatar */}
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                            memberIsOwner
                              ? "bg-amber-500/15 text-amber-400"
                              : member.role === 'admin'
                              ? "bg-indigo-500/15 text-indigo-400"
                              : "bg-white/8 text-white/50"
                          )}>
                            {member.user.avatar ? (
                              <img src={member.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              member.user.name.charAt(0).toUpperCase()
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white/80 font-medium truncate">{member.user.name}</span>
                              {memberIsOwner && (
                                <span className="flex items-center gap-0.5 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                  <Crown className="w-2.5 h-2.5" /> Owner
                                </span>
                              )}
                              {member.role === 'admin' && !memberIsOwner && (
                                <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>
                              )}
                              {isCurrentUser && (
                                <span className="text-[10px] text-white/25">(you)</span>
                              )}
                            </div>
                            <p className="text-xs text-white/25 truncate">{member.user.email}</p>
                          </div>

                          {/* Actions */}
                          {isAdmin && !memberIsOwner && !isCurrentUser && (
                            <button
                              onClick={() => handleRemoveMember(member.user._id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-white/25 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                              title="Remove member"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isCurrentUser && !memberIsOwner && (
                            <button
                              onClick={() => handleRemoveMember(member.user._id)}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-white/25 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                            >
                              <LogOut className="w-3 h-3" /> Leave
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Workspace Info */}
                <div className="px-4 py-3.5 bg-indigo-500/[0.04] border border-indigo-500/10 rounded-xl">
                  <p className="text-xs text-indigo-300/60 leading-relaxed">
                    <span className="font-semibold text-indigo-300/80">Tip:</span> Workspace tasks are visible to all members.
                    Set a task's visibility to "workspace" to share it with this team.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* ── Empty State ── */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
              <Briefcase className="w-10 h-10 text-indigo-400/60" />
            </div>
            <h3 className="text-lg font-semibold text-white/70 mb-2">Create your first workspace</h3>
            <p className="text-sm text-white/35 max-w-sm leading-relaxed mb-6">
              Workspaces let you collaborate with others. Create one, invite your team, and start sharing tasks.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Workspace
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
