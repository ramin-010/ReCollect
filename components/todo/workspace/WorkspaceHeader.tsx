'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Briefcase, ChevronDown, Plus, CheckCircle2, Loader2, X, UserPlus, Settings, Link2 } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui-base/DropdownMenu';

interface WorkspaceHeaderProps {
  workspaces: any[];
  selectedWorkspace: any | null;
  activeSpaceId: string | null;
  isAdmin: boolean;
  stats: any | null;
  showCreateForm: boolean;
  setShowCreateForm: (show: boolean) => void;
  showCreateSpace: boolean;
  setShowCreateSpace: (show: boolean) => void;
  newWorkspaceName: string;
  setNewWorkspaceName: (val: string) => void;
  newSpaceName: string;
  setNewSpaceName: (val: string) => void;
  isCreating: boolean;
  handleCreate: () => void;
  newSpaceInput: string;
  setNewSpaceInput: (val: string) => void;
  isCreatingSpace: boolean;
  handleCreateSpace: () => void;
  onWorkspaceSelect: (ws: any) => void;
  onSpaceSelect: (spaceId: string) => void;
  setShowSettingsModal: (val: boolean) => void;
  setIsInviting: (val: boolean) => void;
  setShowShareLinkModal: (val: boolean) => void;
}

const backgroundImages: string[] = []; // Intentionally blank for abstract dark mode

export function WorkspaceHeader({
  workspaces,
  selectedWorkspace,
  activeSpaceId,
  isAdmin,
  stats,
  showCreateForm,
  setShowCreateForm,
  showCreateSpace,
  setShowCreateSpace,
  newWorkspaceName,
  setNewWorkspaceName,
  newSpaceName,
  setNewSpaceName,
  isCreating,
  handleCreate,
  newSpaceInput,
  setNewSpaceInput,
  isCreatingSpace,
  handleCreateSpace,
  onWorkspaceSelect,
  onSpaceSelect,
  setShowSettingsModal,
  setIsInviting,
  setShowShareLinkModal
}: WorkspaceHeaderProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (backgroundImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentImage = backgroundImages.length > 0 ? backgroundImages[currentImageIndex] : null;
  
  // Stats
  const progress = stats?.totalTasks > 0 ? Math.round((stats.completed / stats.totalTasks) * 100) : 0;
  const pendingCount = stats?.pending || 0;

  const activeSpace = selectedWorkspace?.spaces?.find((s: any) => s._id === activeSpaceId);

  return (
    <div className="relative w-full h-[20vh] min-h-[200px] -mt-16 pt-16">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Default Gradient Background */}
            <div className={`absolute inset-0bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-900`} />
            
             {/* Slider Images */}
            <AnimatePresence mode="wait">
                 {currentImage && (
                    <motion.img
                        key={currentImageIndex}
                        src={currentImage}
                        alt="Header background"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 0.4, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2 }}
                        className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 mix-blend-overlay"
                    />
                )}
            </AnimatePresence>

             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 opacity-30 blur-3xl" />

             {/* Noise Texture */}
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none" />


        </div>

      <div className="relative z-10 w-full h-full max-w-[1200px] mx-auto px-6 md:px-8 flex flex-col justify-end pb-3">
        
        {/* TOP ROW: Action Bar (Avatars, Invite, Settings) */}
        <div className="absolute top-0 right-6 md:right-8 flex   items-center justify-end pt-4 z-20">
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="flex items-center gap-2"
          >
            {/* Member Avatar Strip */}
            <div className="flex items-center mr-1 ">
              {selectedWorkspace?.members?.slice(0, 4).map((member: any, index: number) => {
                const mUser = member.user || member;
                const zIndex = 10 - index;
                return (
                  <div 
                    key={mUser._id || index}
                    className={cn(
                      "w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-500 border-2 border-[hsl(var(--background))] flex items-center justify-center text-[10px] font-bold shadow-sm transition-transform hover:-translate-y-0.5 cursor-default",
                      index > 0 && "-ml-2"
                    )}
                    style={{ zIndex }}
                    title={mUser.name || mUser.email}
                  >
                    {mUser.avatar ? (
                      <img src={mUser.avatar} alt="" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      getInitials(mUser.name)
                    )}
                  </div>
                );
              })}
              {(selectedWorkspace?.members?.length || 0) > 4 && (
                <div 
                  className="w-7 h-7 rounded-full bg-[hsl(var(--muted))]/30 text-[hsl(var(--muted-foreground))] border-2 border-[hsl(var(--card))] flex items-center justify-center text-[9px] font-bold shadow-sm -ml-2 cursor-default" 
                  style={{ zIndex: 0 }}
                  title={`${selectedWorkspace!.members!.length - 4} more`}
                >
                  +{selectedWorkspace!.members!.length - 4}
                </div>
              )}
            </div>

            {isAdmin && (
              <>
              <button
                onClick={() => { setShowSettingsModal(true); setIsInviting(true); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5  hover:bg-[hsl(var(--muted))]/60 text-[hsl(var(--foreground))]/70 hover:text-[hsl(var(--foreground))] text-[11px] font-semibold rounded-lg transition-all border border-[hsl(var(--border))] hover:border-[hsl(var(--border))]"
              >
                <UserPlus className="w-3 h-3" />
                Invite
              </button>
              <button
                onClick={() => setShowShareLinkModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5  hover:bg-[hsl(var(--muted))]/60 text-[hsl(var(--foreground))]/70 hover:text-[hsl(var(--foreground))] text-[11px] font-semibold rounded-lg transition-all border border-[hsl(var(--border))] hover:border-[hsl(var(--border))]"
              >
                <Link2 className="w-3 h-3" />
                Share
              </button>
              </>
            )}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 text-[hsl(var(--foreground))]/70 hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30 rounded-lg transition-all"
              title="Workspace Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* BOTTOM ROW: Identity */}
        <div className="flex items-end justify-between w-full">
          {/* LEFT: Identity (Elegant Serif + Selectors) */}
          <div className="flex flex-col justify-end space-y-1 mb-2">
               {/* Workspace Dropdown */}
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button onClick={() => setShowCreateForm(false)} className="flex items-center gap-2 text-[hsl(var(--foreground))]/90 hover:text-[hsl(var(--foreground))] transition-colors group outline-none focus:outline-none bg-transparent rounded-lg hover:bg-[hsl(var(--muted))]/30 px-2 -ml-2 mb-0.5">
                      <motion.h1 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="text-[15px] md:text-[17px] font-medium tracking-tight text-[hsl(var(--foreground))]/80 font-sans leading-none flex items-center"
                      >
                          <span className="uppercase">{selectedWorkspace?.name}</span>
                          <span className="opacity-40 normal-case ml-2">Workspace</span>
                      </motion.h1>
                      <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]/40 opacity-20 group-hover:text-[hsl(var(--muted-foreground))] group-hover:opacity-100 transition-colors mt-[1px]" />
                    </button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[300px] bg-[hsl(var(--card))] border-[hsl(var(--border))] shadow-xl rounded-xl p-1 z-50">
                  <div className="px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]/40">Workspaces</span>
                  </div>
                  {workspaces.map(ws => (
                    <DropdownMenuItem
                      key={ws._id}
                      onClick={() => onWorkspaceSelect(ws)}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors !outline-none text-sm",
                        selectedWorkspace?._id === ws._id ? "bg-[hsl(var(--muted))]/30 text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/20 hover:text-[hsl(var(--foreground))]/80"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold",
                        selectedWorkspace?._id === ws._id ? "bg-[hsl(var(--muted))]/40 text-[hsl(var(--foreground))]/70" : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]"
                      )}>
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{ws.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-[hsl(var(--border))] my-1" />
                  
                  {showCreateForm ? (
                    <div className="p-2 bg-[hsl(var(--muted))]/10 rounded-lg mt-1" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={newWorkspaceName}
                              onChange={(e) => setNewWorkspaceName(e.target.value)}
                              placeholder="Workspace name…"
                              className="w-full bg-[hsl(var(--muted))]/10 border border-[hsl(var(--border))] rounded-md text-xs text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/40 outline-none px-2 py-1.5 focus:border-[hsl(var(--border))]"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newSpaceName}
                                onChange={(e) => setNewSpaceName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                placeholder="First space (e.g. Team 1)"
                                className="flex-1 bg-[hsl(var(--muted))]/10 border border-[hsl(var(--border))] rounded-md text-xs text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/40 outline-none px-2 py-1.5 focus:border-[hsl(var(--border))]"
                              />
                              <button
                                onClick={handleCreate}
                                disabled={!newWorkspaceName.trim() || isCreating}
                                className="px-2 py-1.5 text-xs font-medium text-[hsl(var(--background))] bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 rounded-md transition-colors disabled:opacity-40 whitespace-nowrap"
                              >
                                {isCreating ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Create'}
                              </button>
                              <button onClick={() => setShowCreateForm(false)} className="p-1.5 text-[hsl(var(--muted-foreground))]/50 hover:text-[hsl(var(--muted-foreground))]">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                    </div>
                  ) : (
                    <DropdownMenuItem
                      onClick={(e) => { e.preventDefault(); setShowCreateForm(true); }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[hsl(var(--muted-foreground))]/60 hover:bg-[hsl(var(--muted))]/20 hover:text-[hsl(var(--foreground))]/70 !outline-none"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Workspace
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
                            {/* Space Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button onClick={() => setShowCreateSpace(false)} className="flex items-center gap-2 text-[hsl(var(--foreground))]/90 hover:text-[hsl(var(--foreground))] transition-colors group outline-none focus:outline-none bg-transparent rounded-lg px-2 -ml-2">
                    <motion.div 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: 0.15 }}
                       className="flex items-center gap-2"
                    >
                      <span className="text-[26px] md:text-[32px] font-bold tracking-tight font-sans text-[hsl(var(--foreground))] leading-none">
                        {activeSpaceId === 'all' ? 'All Spaces' : activeSpace?.name || 'Select Space'}
                      </span>
                      <ChevronDown className="w-5 h-5 opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))]/40 group-hover:text-[hsl(var(--muted-foreground))] transition-colors" />
                    </motion.div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px] bg-[hsl(var(--card))] border-[hsl(var(--border))] shadow-xl rounded-xl z-50 mt-1">
                  <div className="px-2 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]/40">Sub spaces of {selectedWorkspace?.name}</span>
                  </div>
                  {selectedWorkspace?.spaces?.map((space: any) => (
                    <DropdownMenuItem
                      key={space._id}
                      onClick={() => onSpaceSelect(space._id)}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors !outline-none text-sm",
                        activeSpaceId === space._id ? "bg-[hsl(var(--muted))]/30 text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/20 hover:text-[hsl(var(--foreground))]/80"
                      )}
                    >
                      <span className="truncate">{space.name }</span>
                    </DropdownMenuItem>
                  ))}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator className="bg-[hsl(var(--border))] my-1" />
                      {showCreateSpace ? (
                        <div className="flex items-center gap-1.5 px-2 py-1.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={newSpaceInput}
                            onChange={(e) => setNewSpaceInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateSpace()}
                            placeholder="Space name"
                            className="flex-1 min-w-0 bg-[hsl(var(--muted))]/10 border border-[hsl(var(--border))] rounded-md text-xs text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/40 px-2 py-1 outline-none focus:border-[hsl(var(--border))]"
                            autoFocus
                          />
                          <button
                            onClick={handleCreateSpace}
                            disabled={!newSpaceInput.trim() || isCreatingSpace}
                            className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--muted))]/20 hover:bg-[hsl(var(--muted))]/40 rounded transition-colors disabled:opacity-50"
                          >
                            {isCreatingSpace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => { setShowCreateSpace(false); setNewSpaceInput(''); }}
                            className="p-1 text-[hsl(var(--muted-foreground))]/60 hover:text-[hsl(var(--muted-foreground))] bg-transparent rounded transition-colors"
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
            <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[hsl(var(--muted-foreground))]/60 text-xs font-medium pl-1 mt-1 border-l-2 border-indigo-500/30"
            >
                {pendingCount} active team tasks across this view.
            </motion.p>
        </div>

        {/* RIGHT: Clean spacer */}
        <div />
        </div>
      </div>
    </div>
  );
}
