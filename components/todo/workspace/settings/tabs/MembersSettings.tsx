'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, X, UserPlus, Crown, LogOut, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSettingsProps } from '../types';
import { workspaceTodoApi } from '@/lib/api/workspaceTodoApi';

export function MembersSettings({
  selectedWorkspace,
  currentUser,
  isAdmin,
  isInviting,
  setIsInviting,
  inviteEmail,
  setInviteEmail,
  isInviteLoading,
  handleInvite,
  handleRemoveMember,
  handleUpdateRole
}: Omit<WorkspaceSettingsProps, 'isOpen' | 'onClose' | 'onDeleteWorkspace'>) {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    if (!inviteEmail || inviteEmail.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const users = await workspaceTodoApi.searchUsers(inviteEmail.trim());
        // Filter out users who are already members
        const existingMemberIds = selectedWorkspace?.members.map((m: any) => m.user?._id) || [];
        const filteredUsers = users.filter((u: any) => !existingMemberIds.includes(u._id));
        setSearchResults(filteredUsers);
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inviteEmail, selectedWorkspace]);

  const handleSelectUser = (email: string) => {
    setInviteEmail(email);
    setShowDropdown(false);
  };

  const getInitials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  if (!selectedWorkspace) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Workspace Members</h2>
        <p className="text-sm text-white/40">Manage who has access to this workspace and their permissions.</p>
      </div>

      <AnimatePresence>
        {isInviting && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
          >
            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 mb-4 relative z-10" ref={dropdownRef}>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-white/25 shrink-0" />
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  onFocus={() => { if (inviteEmail.trim().length >= 2) setShowDropdown(true); }}
                  placeholder="Search name or type email address…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none focus:border-white/100 transition-colors"
                  autoFocus
                />
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || isInviteLoading}
                  className="px-3.5 py-1.5 text-xs font-medium text-black bg-white hover:bg-white/90 rounded-lg transition-colors disabled:opacity-40"
                >
                  {isInviteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Invite'}
                </button>
                <button
                  onClick={() => { setIsInviting(false); setInviteEmail(''); }}
                  className="p-1 text-white/30 hover:text-white/60"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search Dropdown */}
              <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#171717] border border-white/5 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                >
                  <div className="max-h-64 overflow-y-auto py-2">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((user) => (
                        <button
                          key={user._id}
                          onClick={() => handleSelectUser(user.email)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                        >
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold">
                              {getInitials(user.name)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white/90 truncate">{user.name}</p>
                            <p className="text-xs text-white/40 truncate">{user.email}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-white/40 text-center">
                        No users found
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAdmin && !isInviting && (
        <button
          onClick={() => setIsInviting(true)}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm text-white/30 bg-white/[0.01] border border-dashed border-white/8 rounded-xl hover:bg-white/[0.03] hover:text-white/45 hover:border-white/15 transition-all mb-4"
        >
          <UserPlus className="w-4 h-4" />
          Invite a team member
        </button>
      )}

      <div className="bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/[0.03]">
        {selectedWorkspace.members.map((member: any) => {
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
                  {!memberIsOwner && isAdmin && (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.user._id, e.target.value)}
                      className={cn(
                        "text-[10px] bg-transparent outline-none cursor-pointer border border-white/10 rounded px-1 flex appearance-none font-bold uppercase tracking-wider",
                        member.role === 'admin' ? "text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10" 
                          : member.role === 'viewer' ? "text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10"
                          : "text-white/40 hover:bg-white/5"
                      )}
                    >
                      <option className="bg-[#1E1E1E] text-white font-normal capitalize tracking-normal" value="admin">Admin</option>
                      <option className="bg-[#1E1E1E] text-white font-normal capitalize tracking-normal" value="member">Member</option>
                      <option className="bg-[#1E1E1E] text-white font-normal capitalize tracking-normal" value="viewer">Viewer</option>
                    </select>
                  )}
                  {!memberIsOwner && !isAdmin && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                      member.role === 'admin' ? "text-indigo-400/80 bg-indigo-500/10"
                        : member.role === 'viewer' ? "text-emerald-400/80 bg-emerald-500/10"
                        : "text-white/30 bg-white/5"
                    )}>
                      {member.role}
                    </span>
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
  );
}
