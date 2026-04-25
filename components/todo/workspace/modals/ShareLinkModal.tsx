'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Copy, Check, Loader2, Trash2, Users, Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { workspaceApi, Workspace } from '@/lib/api/workspaceApi';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui-base/DropdownMenu';

interface InviteLink {
  _id: string;
  token: string;
  spaceId: string | null;
  useCount: number;
  createdAt: string;
}

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace;
}

export function ShareLinkModal({ isOpen, onClose, workspace }: ShareLinkModalProps) {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [existingLinks, setExistingLinks] = useState<InviteLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  // Fetch existing links when modal opens
  useEffect(() => {
    if (isOpen && workspace) {
      setIsLoadingLinks(true);
      
      // Default to first space if available
      if (workspace.spaces && workspace.spaces.length > 0) {
        setSelectedSpaceId(workspace.spaces[0]._id);
      } else {
        setSelectedSpaceId(null);
      }

      workspaceApi.getInviteLinks(workspace._id)
        .then(res => {
          if (res.success) setExistingLinks(res.data);
        })
        .catch(() => {})
        .finally(() => setIsLoadingLinks(false));
    } else {
      setGeneratedLink(null);
      setSelectedSpaceId(null);
      setCopied(false);
    }
  }, [isOpen, workspace]);

  const handleGenerate = useCallback(async () => {
    if (!workspace) return;
    if (!selectedSpaceId) {
      toast.error('Please select a space first');
      return;
    }

    try {
      setIsGenerating(true);
      const res = await workspaceApi.generateInviteLink(
        workspace._id,
        selectedSpaceId
      );
      if (res.success) {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/workspace/join/${res.data.token}`;
        setGeneratedLink(link);
        // Refresh links list
        workspaceApi.getInviteLinks(workspace._id).then(r => {
          if (r.success) setExistingLinks(r.data);
        });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to generate link');
    } finally {
      setIsGenerating(false);
    }
  }, [workspace, selectedSpaceId]);

  const handleCopy = useCallback(() => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [generatedLink]);

  const handleRevoke = useCallback(async (linkId: string) => {
    if (!workspace) return;
    try {
      const res = await workspaceApi.revokeInviteLink(workspace._id, linkId);
      if (res.success) {
        setExistingLinks(prev => prev.filter(l => l._id !== linkId));
        setGeneratedLink(null);
        toast.success('Link revoked');
      }
    } catch {
      toast.error('Failed to revoke link');
    }
  }, [workspace, generatedLink]);

  const getSpaceName = (spaceId: string | null) => {
    if (!spaceId) return 'Select a Space';
    return workspace.spaces.find(s => s._id === spaceId)?.name || 'Unknown Space';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0"
        >
          {/* Subtle Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[hsl(var(--background))]/80 backdrop-blur-sm" 
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-[480px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-4 border border-[hsl(var(--primary))]/20 shadow-sm">
                  <Link2 className="w-5 h-5 text-[hsl(var(--primary))]" />
                </div>
                <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] tracking-tight">Share Link</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1.5 leading-relaxed">
                  Anyone with this link can request to join {workspace.name}. Admin approval required.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-6 space-y-6">
              
              {/* Scope Selector */}
              <div className="flex items-center justify-between py-1 border-b border-[hsl(var(--border))]/50 pb-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center border border-[hsl(var(--border))]">
                        <Globe className="w-4 h-4 text-[hsl(var(--foreground))]" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">Invite Access Scope</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Control what they see first</p>
                    </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--muted))] bg-[hsl(var(--background))] transition-colors text-sm font-medium text-[hsl(var(--foreground))] border border-[hsl(var(--border))]/50 shadow-sm">
                      {getSpaceName(selectedSpaceId)}
                      <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[hsl(var(--popover))] border-[hsl(var(--border))] min-w-[180px]">
                    {workspace.spaces.map(space => (
                      <DropdownMenuItem 
                        key={space._id} 
                        onClick={() => setSelectedSpaceId(space._id)}
                        className="text-[hsl(var(--foreground))] flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] opacity-60" />
                        {space.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Generate / Link Result Action */}
              <div className="pt-1">
                <AnimatePresence mode="wait">
                  {generatedLink ? (
                    <motion.div
                      key="link-result"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3"
                    >
                      <div className="flex gap-2">
                        <div 
                            className="flex-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] shadow-inner rounded-xl px-4 py-3 cursor-pointer hover:border-[hsl(var(--border))]/80 transition-colors overflow-hidden group"
                            onClick={handleCopy}
                        >
                          <p className="text-sm text-[hsl(var(--foreground))] font-mono truncate select-all">{generatedLink}</p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 font-medium tracking-wide uppercase group-hover:text-[hsl(var(--primary))] transition-colors">Click to copy</p>
                        </div>
                        <button
                          onClick={handleCopy}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all",
                              copied 
                              ? 'bg-emerald-500 text-[hsl(var(--background))] border-emerald-600'
                              : 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90'
                            )}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex justify-end pr-1">
                        <button
                          onClick={() => setGeneratedLink(null)}
                          className="text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                        >
                          Create another link
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="generate-btn"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      onClick={handleGenerate}
                      disabled={isGenerating || !selectedSpaceId || isLoadingLinks}
                      className="w-full h-11 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:scale-[0.98] rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                      {isGenerating ? 'Generating...' : 'Create Invite Link'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

            </div>

            {/* Active links section */}
            {existingLinks.length > 0 && (
              <div className="border-t border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/30 px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    Active Links ({existingLinks.length})
                  </h3>
                </div>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                  {existingLinks.map((link, idx) => (
                    <motion.div
                      key={link._id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="group flex items-center justify-between p-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))]/80 rounded-xl hover:border-[hsl(var(--border))] hover:shadow-sm transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm text-[hsl(var(--foreground))] font-medium truncate">
                            {getSpaceName(link.spaceId)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" /> {link.useCount}
                            </span>
                            <span>·</span>
                            <span>{new Date(link.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/workspace/join/${link.token}`);
                            toast.success('Copied!');
                          }}
                          className="w-8 h-8 rounded-md flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                          title="Copy Link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRevoke(link._id)}
                          className="w-8 h-8 rounded-md flex items-center justify-center text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Revoke Link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
