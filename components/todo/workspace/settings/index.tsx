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

const TABS: TabConfig[] = [
  { id: 'members', label: 'Members', icon: Users },
  { id: 'roles', label: 'Manage Roles', icon: Shield },
  { id: 'customization', label: 'Customization', icon: Palette },
  { id: 'danger', label: 'Delete Workspace', icon: Trash2, isDestructive: true },
];

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
  onDeleteWorkspace
}: WorkspaceSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabType>('members');

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
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
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-4xl bg-[#1E1E1E] border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row h-[80vh] min-h-[500px] z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button (Mobile Absolute) */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-colors z-10 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Sidebar */}
            <div className="w-full md:w-64 bg-[#171717] border-b md:border-b-0 md:border-r border-white/5 flex flex-col p-4 md:p-6 shrink-0">
              <div className="mb-6 md:mb-8 hidden md:block">
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-1">Settings</h2>
                <h3 className="text-lg font-bold text-white truncate">{selectedWorkspace.name}</h3>
              </div>
              
              <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
                {TABS.filter(t => isAdmin || t.id === 'members').map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTabType)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap md:whitespace-normal outline-none",
                        isActive 
                          ? (tab.isDestructive ? "bg-rose-500/10 text-rose-400" : "bg-white/10 text-white") 
                          : (tab.isDestructive ? "text-rose-400/60 hover:bg-rose-500/5 hover:text-rose-400" : "text-white/50 hover:bg-white/5 hover:text-white/80")
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-stretch overflow-hidden bg-[#1E1E1E]">
              {/* Desktop Close Button Header */}
              <div className="hidden md:flex justify-end p-4 border-b border-transparent">
                <button 
                  onClick={onClose}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* View Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
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
                    />
                  )}
                  {activeTab === 'roles' && <RolesSettings />}
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
                    />
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
