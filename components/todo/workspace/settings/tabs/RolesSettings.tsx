import React, { useState } from 'react';
import { Shield, Sparkles, User, Eye, Check, Search, ChevronRight } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { WorkspaceSettingsProps } from '../types';

function CrownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

export function RolesSettings({
  selectedWorkspace,
  currentUser,
  isAdmin,
  handleUpdateRole
}: Pick<WorkspaceSettingsProps, 'selectedWorkspace' | 'currentUser' | 'isAdmin' | 'handleUpdateRole'>) {
  const [searchMember, setSearchMember] = useState('');
  const [activeRoleTab, setActiveRoleTab] = useState('admin');
  
  const roles = [
    {
      id: 'owner',
      title: 'Owner',
      icon: CrownIcon,
      description: 'The creator of the workspace. Ultimate authority.',
      permissions: [
        'Delete the workspace entirely',
        'Transfer workspace ownership',
        'Manage billing and subscriptions',
        'All Admin permissions'
      ]
    },
    {
      id: 'admin',
      title: 'Admin',
      icon: Shield,
      description: 'Trusted managers who can configure the workspace.',
      permissions: [
        'Invite new members to the workspace',
        'Manage spaces and categories',
        'Update workspace settings (e.g. Overview access)',
        'Change member roles (excluding Owner)',
        'Remove members from the workspace',
        'Delete any task regardless of creator'
      ]
    },
    {
      id: 'member',
      title: 'Member',
      icon: User,
      description: 'Standard collaborators within the workspace.',
      permissions: [
        'Create new tasks in any space',
        'Edit task details and descriptions',
        'Change task status, priority, and due dates',
        'Assign tasks to themselves or others',
        'Delete tasks they created'
      ]
    },
    {
      id: 'viewer',
      title: 'Viewer',
      icon: Eye,
      description: 'Read-only participants for visibility without mutation rights.',
      permissions: [
        'View the Workspace Overview (if permitted by Admin)',
        'Browse all Spaces and Task Lists',
        'View Task Details, assignees, and descriptions',
        'Cannot edit, assign, status-toggle, or delete any task',
        'Cannot manage workspace settings or members'
      ]
    }
  ];

  // getInitials is imported from utils

  // Filter members by search input
  const filteredMembers = selectedWorkspace?.members.filter((member: any) =>
    member.user?.name.toLowerCase().includes(searchMember.toLowerCase()) ||
    member.user?.email.toLowerCase().includes(searchMember.toLowerCase())
  ) || [];

  if (!selectedWorkspace) return null;

  const activeRole = roles.find(r => r.id === activeRoleTab) || roles[1];
  const ActiveIcon = activeRole.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-18">
      {/* Header */}
      <div className="shrink-0">
        <h2 className="text-[17px] font-medium text-white/90 mb-1">Manage Roles</h2>
        <p className="text-[12px] text-white/40 tracking-wide">Configure workspace permissions and assign roles to your team.</p>
      </div>
      
      {/* Top Section: Interactive Role Dictionary */}
      <div className="shrink-0">
        <h3 className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] ml-0.5 mb-3">Role Capabilities</h3>
        
        {/* Horizontal Role Selector */}
        <div className="flex items-center p-1 bg-[#171717] rounded-lg border border-white/5 w-fit mb-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRoleTab(role.id)}
              className={cn(
                "px-5 py-1.5 rounded-md text-[12px] font-medium transition-all tracking-wide",
                activeRoleTab === role.id 
                  ? "bg-white/[0.06] text-white shadow-sm" 
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.02]"
              )}
            >
              {role.title}
            </button>
          ))}
        </div>

        {/* Active Role Card */}
        <div className="bg-[#171717]/50 border border-white/[0.03] rounded-xl p-6 md:p-8 transition-all">
          <div className="flex items-start gap-5 mb-6">
            <div className="p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/5">
              <ActiveIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white/90 tracking-tight mb-1.5">{activeRole.title}</h3>
              <p className="text-[12px] text-white/40 tracking-wide leading-relaxed max-w-xl">{activeRole.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3.5 gap-x-12 pl-14">
            {activeRole.permissions.map((perm, idx) => (
              <div key={idx} className="flex items-start gap-3 group/perm">
                <div className="mt-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-indigo-500/10 text-indigo-400/70 border border-indigo-500/20 group-hover/perm:text-indigo-400 transition-colors">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span className="text-[12px] text-white/60 tracking-tight leading-relaxed group-hover/perm:text-white/80 transition-colors">{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Member Assignment */}
      <div className="border-t border-white/5 pt-10">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] ml-0.5">Assign Roles</h3>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input 
              type="text" 
              placeholder="Find member..."
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              className="w-48 bg-white/[0.02] border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredMembers.map((member: any) => {
            const isCurrentUser = member.user?._id === currentUser?._id;
            const isWorkspaceOwner = member.user?._id === selectedWorkspace?.owner?._id;
            
            // Only Owner can change Admin/Owner roles. Admins can change Member/Viewer roles.
            const isChangeable = isAdmin && !isWorkspaceOwner && (currentUser?._id === selectedWorkspace?.owner?._id || member.role !== 'admin');

            return (
              <div 
                key={member.user?._id} 
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border hover:bg-white/[0.02] border-transparent hover:border-white/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  {member.user?.avatar ? (
                    <img src={member.user.avatar} alt="" className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold">
                      {getInitials(member.user?.name || '?')}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-white/90">
                        {member.user?.name}
                        {isCurrentUser && <span className="ml-2 text-[10px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded tracking-wide font-normal">YOU</span>}
                      </p>
                    </div>
                    <p className="text-[11px] text-white/40 mt-0.5">{member.user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isWorkspaceOwner ? (
                    <div className="px-2.5 py-1 text-[10px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded truncate flex items-center gap-1.5">
                      <CrownIcon className="w-3 h-3" />
                      OWNER
                    </div>
                  ) : (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.user._id, e.target.value)}
                      disabled={!isChangeable}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-medium rounded outline-none border transition-colors tracking-wide appearance-none cursor-pointer",
                        member.role === 'admin' && "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                        member.role === 'member' && "text-white/70 bg-white/5 border-white/10",
                        member.role === 'viewer' && "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                        !isChangeable && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <option value="admin" className="bg-[#1E1E1E] text-indigo-400">ADMIN</option>
                      <option value="member" className="bg-[#1E1E1E] text-white/70">MEMBER</option>
                      <option value="viewer" className="bg-[#1E1E1E] text-emerald-400">VIEWER</option>
                    </select>
                  )}
                </div>
              </div>
            );
          })}
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-[12px] text-white/30 border border-dashed border-white/5 rounded-xl">
              No members found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
