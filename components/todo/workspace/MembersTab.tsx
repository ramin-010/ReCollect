import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, X, UserPlus, Crown, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MembersTabProps {
  selectedWorkspace: any;
  currentUser: any;
  isAdmin: boolean;
  isInviting: boolean;
  setIsInviting: (val: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (val: string) => void;
  isInviteLoading: boolean;
  handleInvite: () => void;
  handleRemoveMember: (id: string) => void;
}

export function MembersTab({
  selectedWorkspace,
  currentUser,
  isAdmin,
  isInviting,
  setIsInviting,
  inviteEmail,
  setInviteEmail,
  isInviteLoading,
  handleInvite,
  handleRemoveMember
}: MembersTabProps) {
  if (!selectedWorkspace) return null;

  return (
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
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none focus:border-white/100 transition-colors"
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
  );
}
