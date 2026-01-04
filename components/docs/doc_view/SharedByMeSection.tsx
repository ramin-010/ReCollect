'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Trash2, Loader2, Share2, Users, 
  Star, ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { SharedByMeSectionProps } from './types';

export const SharedByMeSection = ({ sharedByMeDocs, isLoading, onRefresh }: SharedByMeSectionProps) => {
  const [updatingRole, setUpdatingRole] = useState<{docId: string; userId: string} | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<{url: string; name: string} | null>(null);

  const handleUpdateRole = async (docId: string, collaboratorId: string, newRole: 'editor' | 'viewer') => {
    try {
      setUpdatingRole({ docId, userId: collaboratorId });
      await axiosInstance.patch(`/api/docs/${docId}/collaborators/${collaboratorId}`, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
      onRefresh();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveCollaborator = async (docId: string, collaboratorId: string) => {
    try {
      await axiosInstance.delete(`/api/docs/${docId}/collaborators/${collaboratorId}`);
      toast.success('Collaborator removed');
      onRefresh();
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading shared docs...</p>
      </div>
    );
  }

  if (sharedByMeDocs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-4">
          <Share2 className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No shared documents</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
          Documents you share with others will appear here. Share a doc to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Documents You've Shared</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage access permissions for your shared documents
          </p>
        </div>
        <span className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/50 px-3 py-1 rounded-full">
          {sharedByMeDocs.length} document{sharedByMeDocs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {sharedByMeDocs.map((doc) => (
        <motion.div 
          key={doc._id} 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-sm"
        >
          {/* Doc Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[hsl(var(--muted))]/30 to-transparent border-b border-[hsl(var(--border))]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">{doc.title || 'Untitled'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                      {doc.docType || 'notes'}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <span className="text-sm font-medium">
                  {doc.collaborators?.length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Collaborators Table */}
          <div className="px-5 py-3">
            <div className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-1">
              Collaborators
            </div>
            <div className="space-y-1">
              {doc.collaborators?.map((collab: any) => {
                const collabUser = collab.user;
                const userId = typeof collabUser === 'object' ? collabUser._id : collabUser;
                const userName = typeof collabUser === 'object' ? collabUser.name : 'Unknown';
                const userEmail = typeof collabUser === 'object' ? collabUser.email : '';
                const userAvatar = typeof collabUser === 'object' ? collabUser.avatar : '';
                const isUpdating = updatingRole?.docId === doc._id && updatingRole?.userId === userId;

                return (
                  <div 
                    key={userId} 
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[hsl(var(--muted))]/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {userAvatar ? (
                        <img 
                          src={userAvatar} 
                          alt={userName} 
                          className="w-9 h-9 rounded-full object-cover shrink-0 cursor-zoom-in hover:ring-2 hover:ring-blue-500/50 transition-all"
                          onDoubleClick={() => setAvatarPreview({ url: userAvatar, name: userName })}
                          title="Double-click to enlarge"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                          {userName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{userName}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            disabled={isUpdating} 
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 ${
                              collab.role === 'editor' 
                                ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/25' 
                                : 'bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/25'
                            } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                {collab.role === 'editor' ? 'Can Edit' : 'View Only'}
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => handleUpdateRole(doc._id, userId, 'editor')}>
                            <Star className="w-4 h-4 mr-2 text-amber-500" /> Can Edit
                            {collab.role === 'editor' && <span className="ml-auto text-amber-500">✓</span>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(doc._id, userId, 'viewer')}>
                            <FileText className="w-4 h-4 mr-2 text-blue-500" /> View Only
                            {collab.role === 'viewer' && <span className="ml-auto text-amber-500">✓</span>}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <button 
                        onClick={() => handleRemoveCollaborator(doc._id, userId)}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-100 group-hover:opacity-100"
                        title="Remove access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Avatar Preview Modal */}
      <AnimatePresence>
        {avatarPreview && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setAvatarPreview(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={avatarPreview.url} 
                alt={avatarPreview.name} 
                className="w-64 h-64 md:w-80 md:h-80 rounded-2xl object-cover shadow-2xl border-4 border-white/10"
              />
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center">
                <p className="text-white font-medium text-lg">{avatarPreview.name}</p>
                <p className="text-white/60 text-sm">Click anywhere to close</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SharedByMeSection;
