'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Shield, Palette, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSettingsProps, SettingsTabType, TabConfig } from './types';
import { MembersSettings } from './tabs/MembersSettings';
import { RolesSettings } from './tabs/RolesSettings';
import { CustomizationSettings } from './tabs/CustomizationSettings';
import { DangerSettings } from './tabs/DangerSettings';

export function WorkspaceSettingsModal({
  isOpen,
  onClose,
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
  handleUpdateRole,
  onDeleteWorkspace,
  isOwner,
  onLeaveWorkspace
}: WorkspaceSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabType>('members');

  const TABS: TabConfig[] = [
    { id: 'members', label: 'Members', icon: Users },
    { id: 'roles', label: 'Manage Roles', icon: Shield },
    { id: 'customization', label: 'Customization', icon: Palette },
    { id: 'danger', label: isOwner ? 'Delete Workspace' : 'Leave Workspace', icon: Trash2, isDestructive: true },
  ];

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset tab to members when opening
      setActiveTab('members');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!selectedWorkspace) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-[90vw] max-w-[1150px] h-[85vh] flex flex-col md:flex-row bg-[hsl(var(--background))] rounded-xl shadow-2xl overflow-hidden border border-[hsl(var(--border))]/50 z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button (Mobile Absolute) */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-full transition-colors z-[102] md:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Sidebar Navigation inside Modal */}
            <aside className="hidden md:flex flex-col w-[240px] shrink-0 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--border))]/30">
              <div className="p-4 pl-6 pt-6 mb-2">
                <h2 className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-2">Workspace</h2>
              </div>
              
              <nav className="flex-1 px-3 space-y-[2px] overflow-y-auto custom-scrollbar">
                {TABS.filter(t => isAdmin || t.id === 'members' || t.id === 'danger').map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTabType)}
                      className={`
                        w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-md
                        transition-all duration-200 text-left group text-[14px] font-medium
                        ${isActive 
                          ? (tab.isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-white/10 text-[hsl(var(--foreground))]') 
                          : (tab.isDestructive ? 'text-red-400 hover:bg-red-500/10 hover:text-red-500' : 'text-[hsl(var(--muted-foreground))] hover:bg-white/5 hover:text-[hsl(var(--foreground))]')
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {Icon && <Icon className="h-4 w-4" />}
                        <span className="truncate">{tab.label}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 flex flex-col relative h-full bg-[hsl(var(--background))]">
              {/* Close Button top-right area */}
              <div className="absolute top-4 right-4 z-[101] hidden md:flex">
                <button 
                  onClick={onClose}
                  className="rounded-md w-8 h-8 flex items-center justify-center p-0 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <main className="flex-1 overflow-y-auto px-6 py-10 md:px-20 md:py-14 custom-scrollbar relative">
                <div className="max-w-3xl space-y-8">
                  {/* Header - Notion style */}
                  <div className="mb-2">
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))]/70 mb-1 font-normal">Workspace</div>
                    <h1 className="text-[24px] font-bold text-[hsl(var(--foreground))] leading-tight">
                      {TABS.find(t => t.id === activeTab)?.label}
                    </h1>
                    <p className="text-[14px] text-[hsl(var(--muted-foreground))] mt-1">
                      {activeTab === 'members' && "Manage who has access to this workspace and their permissions"}
                      {activeTab === 'roles' && "Configure workspace permissions and assign roles to your team"}
                      {activeTab === 'customization' && "Customize your workspace appearance and settings"}
                      {activeTab === 'danger' && "Danger zone for workspace management"}
                    </p>
                  </div>

                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-0"
                >
                  {activeTab === 'members' && (
                    <MembersSettings 
                      selectedWorkspace={selectedWorkspace}
                      currentUser={currentUser}
                      isAdmin={isAdmin}
                      isInviting={isInviting}
                      setIsInviting={setIsInviting}
                      inviteEmail={inviteEmail}
                      setInviteEmail={setInviteEmail}
                      isInviteLoading={isInviteLoading}
                      handleInvite={handleInvite}
                      handleRemoveMember={handleRemoveMember}
                      handleUpdateRole={handleUpdateRole}
                      isOwner={isOwner}
                      onLeaveWorkspace={onLeaveWorkspace}
                    />
                  )}
                  {activeTab === 'roles' && (
                    <RolesSettings 
                      selectedWorkspace={selectedWorkspace}
                      currentUser={currentUser}
                      isAdmin={isAdmin}
                      handleUpdateRole={handleUpdateRole}
                    />
                  )}
                  {activeTab === 'customization' && (
                    <CustomizationSettings 
                      selectedWorkspace={selectedWorkspace}
                      isAdmin={isAdmin}
                    />
                  )}
                  {activeTab === 'danger' && (
                    <DangerSettings 
                      workspaceName={selectedWorkspace.name} 
                      onDeleteWorkspace={onDeleteWorkspace} 
                      onClose={onClose}
                      isOwner={isOwner}
                      onLeaveWorkspace={onLeaveWorkspace}
                    />
                  )}
                </motion.div>
                </div>
              </main>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
