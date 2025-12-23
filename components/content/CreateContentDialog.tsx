'use client';

import '@excalidraw/excalidraw/index.css';
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Lock,
  Globe,
  Bell,
  Sparkles,
  X,
  Link2,
  Trash2,
  Tag,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@/components/ui-base/Button';
import { TagSelector } from '@/components/shared/TagSelector';
import { ReminderDialog } from '@/components/notes/ReminderDialog';
import { SmartCanvas } from './SmartCanvas';
import { ContentCanvas } from './contentCanvas';
import axios from 'axios';
import { useCreateNoteState } from '@/lib/hooks/useCreateNoteState';
import axiosInstance from '@/lib/utils/axios';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { imageStorage } from '@/lib/storage/imageStorage';
import MinimalExcalidrawCanvas from './ExcalidrawCanvas';


interface CreateContentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  inline?: boolean;
}

const DEFAULT_TAGS = ['work', 'personal', 'ideas', 'todo'];
const MAX_TAGS = 5;
const MAX_LINKS = 2;

export function CreateContentDialog({
  isOpen,
  onClose,
  dashboardId,
  inline = false
}: CreateContentDialogProps) {
  const { state, updateState, clearState, isLoaded } = useCreateNoteState(dashboardId);
  const addContentToDashboard = useDashboardStore((state) => state.addContent);

  const [isLoading, setIsLoading] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false); // #new: Canvas expansion state
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newLinkInput, setNewLinkInput] = useState('');
  const [sampleTags, setSampleTags] = useState(DEFAULT_TAGS);

  const {
    title = '',
    description = '',
    canvasBlocks = [],
    selectedTags = [],
    visibility = 'Private',
    reminderData,
    links = []
  } = state;

  const setTitle = (value: string) => updateState({ title: value });
  const setDescription = (value: string) => updateState({ description: value });
  const setCanvasBlocks = (blocks: any[]) => updateState({ canvasBlocks: blocks });
  const setVisibility = (v: 'Public' | 'Private') => updateState({ visibility: v });
  const setReminderData = (data: any) => updateState({ reminderData: data });
  const setLinks = (updater: string[] | ((prev: string[]) => string[])) => {
    if (typeof updater === 'function') {
      updateState(prev => ({ links: updater(prev.links) }));
    } else {
      updateState({ links: updater });
    }
  };

  const setSelectedTags = (tagsOrUpdater: string[] | ((prev: string[]) => string[])) => {
    if (typeof tagsOrUpdater === 'function') {
      const newTags = tagsOrUpdater(selectedTags);
      updateState({ selectedTags: newTags });
    } else {
      updateState({ selectedTags: tagsOrUpdater });
    }
  };

  useEffect(() => {
    if (isLoaded && selectedTags) {
      const customTags = selectedTags.filter(tag => !DEFAULT_TAGS.includes(tag));
      setSampleTags([...DEFAULT_TAGS, ...customTags]);
    }
  }, [isLoaded, selectedTags]);

  const toggleTag = (tag: string) => {
    const isDefaultTag = DEFAULT_TAGS.includes(tag);

    setSelectedTags((prevTags: string[]) => {
      if (prevTags.includes(tag)) {
        if (!isDefaultTag) {
          setSampleTags((current: string[]) => current.filter(t => t !== tag));
        }
        return prevTags.filter(t => t !== tag);
      } else {
        if (prevTags.length >= MAX_TAGS) {
          toast.error(`Maximum ${MAX_TAGS} tags allowed`);
          return prevTags;
        }
        return [...prevTags, tag];
      }
    });
  };

  const addCustomTag = () => {
    const trimmedTag = newTagInput.trim().toLowerCase();

    if (!trimmedTag) return;

    if (sampleTags.includes(trimmedTag)) {
      toast.error('Tag already exists');
      return;
    }

    if (selectedTags.length >= MAX_TAGS) {
      toast.error(`Maximum ${MAX_TAGS} tags allowed`);
      return;
    }

    setSampleTags([...sampleTags, trimmedTag]);
    setSelectedTags([...selectedTags, trimmedTag]);
    setNewTagInput('');
    toast.success(`Tag "${trimmedTag}" added`);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  };

  const addLink = () => {
    const trimmedLink = newLinkInput.trim();

    if (!trimmedLink) return;

    if (links.length >= MAX_LINKS) {
      toast.error(`Maximum ${MAX_LINKS} links allowed`);
      return;
    }

    setLinks(prev => [...prev, trimmedLink]);
    setNewLinkInput('');
    toast.success('Link added');
  };

  const handleLinkInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLink();
    }
  };

  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      const blocksToSave = [...canvasBlocks];
      const imageBlockIds: string[] = []; // Track which blocks have images

      for (let i = blocksToSave.length - 1; i >= 0; i--) {
        const block = blocksToSave[i];

        if (block.type === 'image' && !block.isUploaded && block.imageId) {
          const blob = await imageStorage.getImage(block.imageId);

          if (blob) {
            const file = new File([blob], `image.png`, { type: blob.type });
            formData.append(`image_${block.blockId}`, file);
            imageBlockIds.push(block.blockId);

            blocksToSave[i] = {
              ...block,
              url: `PENDING_UPLOAD`,
            };
          }

        } else if (block.type === 'text' && block.content === '') {
          blocksToSave.splice(i, 1);
        }
      }
      // description-02: we need to add the description in the form data

      // Send list of block IDs that have images
      formData.append('imageBlockIds', JSON.stringify(imageBlockIds));
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('body', JSON.stringify(blocksToSave));
      formData.append('tags', JSON.stringify(selectedTags));
      formData.append('visibility', visibility);
      formData.append('links', JSON.stringify(links));
      formData.append('DashId', dashboardId);

      if (reminderData) {
        formData.append('reminderData', JSON.stringify(reminderData));
      }

      const response = await axiosInstance.post('/api/add-content', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data?.success && response.data?.data) {
        addContentToDashboard(dashboardId, response.data.data);
      }
      toast.success('Note created successfully!');
      handleClose();
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message ?? error.message
        : (error instanceof Error ? error.message : 'Failed to create note');
      console.error('Failed to create content:', error);
      toast.error(errorMessage || 'Failed to create note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    canvasBlocks.forEach(block => {
      if (block.type === 'image' && block.url?.startsWith('blob:')) {
        imageStorage.revokeObjectURL(block.url);
      }
    });

    clearState();
    setShowTagInput(false);
    setNewTagInput('');
    setLinks([]);
    setNewLinkInput('');
    setSampleTags(DEFAULT_TAGS);
    onClose();
  };

  const handleSetReminder = async (data: {
    reminderDate: string;
    message?: string;
  }): Promise<void> => {
    setReminderData(data);
    setShowReminderDialog(false);
    toast.success('Reminder set for this note');
  };

  if (!isOpen && !inline) return null;

  const containerClass = inline
    ? 'w-full max-w-7xl mx-auto bg-[hsl(var(--card-bg))]/60 rounded-2xl shadow-lg border border-[hsl(var(--border))] flex flex-col'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none';

  const innerClass = inline
    ? 'flex flex-col pointer-events-auto'
    : 'w-full max-w-3xl bg-[hsl(var(--card-bg))]/60 rounded-2xl shadow-2xl border border-[hsl(var(--border))] flex flex-col max-h-[85vh] pointer-events-auto';

  return (
    <>
      {!inline && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={containerClass} style={inline ? {} : undefined}>
        <div
          className={innerClass}
          onClick={inline ? undefined : (e) => e.stopPropagation()}
        >
          <div className="flex-1 overflow-y-auto p-5 pt-4 space-y-6">
            <div className="flex flex-col gap-2">
              {/* Title & Actions Row */}
              <div className='flex w-full gap-4 items-start'>
                <div className="w-[70%] pr-10">
                  <input
                    type="text"
                    placeholder="Note title..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full text-[40px] pb-4 font-semibold bg-transparent text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none"
                  />

                  <input
                    type="text"
                    placeholder="Add a brief description..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full text-sm pb-4 bg-transparent text-[hsl(var(--muted-foreground))] placeholder:text-[hsl(var(--muted-foreground))/60] focus:outline-none focus:text-[hsl(var(--foreground))]"
                  />
                </div>

                <div className="w-[30%] flex flex-col gap-4">
                  <div className="flex items-center justify-end gap-2">
                    {!inline && (
                      <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg bg-[hsl(var(--sidebar-hover))] hover:bg-[hsl(var(--sidebar-active))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all flex items-center justify-center"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}

                    <Button
                      variant="ghost"
                      onClick={handleClose}
                      disabled={isLoading}
                      size="sm"
                      className="h-9"
                    >
                      Cancel
                    </Button>

                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      isLoading={isLoading}
                      disabled={!title.trim() || !isLoaded}
                      className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg h-9"
                      size="sm"
                    >
                      Create Note
                    </Button>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setVisibility(visibility === 'Private' ? 'Public' : 'Private')}
                      className={`flex items-center justify-center gap-2 px-6 py-1.5 text-xs rounded-lg border font-medium transition-all ${visibility === 'Public'
                        ? 'bg-[hsl(var(--brand-primary))]/10 border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))]'
                        : 'bg-[hsl(0_65%_55%)]/10 border-[hsl(0_55%_35%)] text-[hsl(0_65%_55%)]'
                        }`}
                    >
                      {visibility === 'Private' ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Globe className="h-3.5 w-3.5" />
                      )}
                      {visibility}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowReminderDialog(true)}
                      className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${reminderData
                        ? 'bg-[hsl(var(--brand-primary))]/10 border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))]'
                        : 'bg-[hsl(var(--surface-light))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--muted-foreground))]/50'
                        }`}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      {reminderData ? 'Reminder Set' : 'Set Reminder'}
                      {reminderData && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse ml-1" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Canvas Area - Expandable */}
              <AnimatePresence>
                {isCanvasExpanded && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    onClick={() => setIsCanvasExpanded(false)}
                  />
                )}
              </AnimatePresence>

              <motion.div
                layout
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`transition-colors bg-[hsl(var(--card))] ${isCanvasExpanded
                  ? 'fixed inset-4 z-50 rounded-xl border-2 border-[hsl(var(--brand-primary))]/20 shadow-2xl'
                  : 'relative border-2 rounded-xl border-[hsl(var(--border))]' 
                } overflow-hidden`}
                style={isCanvasExpanded ? {} : (inline
                  ? { minHeight: 220, height: 'clamp(380px,58vh,600px)' }
                  : { height: '340px' }
                )}
              >
                {/* <ContentCanvas
                  initialBlocks={canvasBlocks}
                  onSave={blocks => setCanvasBlocks(blocks)}
                /> */}
                
                <SmartCanvas
                  initialContent={JSON.stringify(canvasBlocks)}
                  onChange={(content) => {
                      try {
                          const blocks = JSON.parse(content);
                          setCanvasBlocks(blocks);
                      } catch (e) {
                          console.error("Failed to parse canvas blocks", e);
                      }
                  }}
                  readOnly={false}
                  />

                {/* Expand Toggle Button */}
                <motion.button
                  layout
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCanvasExpanded(!isCanvasExpanded);
                  }}
                  className="absolute top-1 right-2 p-1.5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--brand-primary))]/50 shadow-sm z-10 opacity-50 hover:opacity-100"
                  title={isCanvasExpanded ? "Collapse" : "Expand Canvas"}
                >
                  {isCanvasExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </motion.button>
              </motion.div>

              {/* Metadata Bar (Horizontal Split - Tight Spacing) */}
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 px-1">
                
                {/* Left: Tags */}
                <div className="flex-1 flex flex-wrap items-center gap-2 w-full">
                  <div className="text-[hsl(var(--muted-foreground))]/40 mr-1">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  
                  {sampleTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${selectedTags.includes(tag)
                        ? 'bg-[hsl(var(--brand-primary))]/5 text-[hsl(var(--brand-primary))]/70'
                        : 'bg-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                        }`}
                    >
                      #{tag}
                    </button>
                  ))}

                  <input
                    type="text"
                    placeholder="+ Tag"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    className="min-w-[40px] border border-[hsl(var(--border))] rounded-md px-2 py-0.5 w-auto max-w-[80px] bg-transparent text-[10px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 focus:outline-none focus:placeholder:text-[hsl(var(--muted-foreground))]/20 transition-all"
                  />
                </div>

                {/* Vertical Divider (Hidden on mobile) */}
                <div className="hidden sm:block w-px h-3 bg-[hsl(var(--border))]/20 mx-1" />

                {/* Right: Links */}
                <div className="flex-1 flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full">
                  <div className="sm:hidden text-[hsl(var(--muted-foreground))] mr-1">
                    <Link2 className="w-3.5 h-3.5" />
                  </div>
                  
                  {links.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 px-2 py-0.5 bg-[hsl(var(--brand-primary))]/5 rounded-md group"
                    >
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[hsl(var(--brand-primary))]/70 hover:underline max-w-[150px] truncate"
                      >
                        {link}
                      </a>
                      <button
                        onClick={() => removeLink(index)}
                        className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-all"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-1.5">
                    <div className="hidden sm:block text-[hsl(var(--muted-foreground))]/40">
                      <Link2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder={links.length === 0 ? "Add Important links..." : "+ Link"}
                      value={newLinkInput}
                      onChange={e => setNewLinkInput(e.target.value)}
                      onKeyDown={handleLinkInputKeyDown}
                      className="min-w-[60px] w-auto border border-[hsl(var(--border))] rounded-md px-2 py-0.5  text-[10px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/50 focus:outline-none text-right focus:placeholder:text-[hsl(var(--muted-foreground))]/30 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReminderDialog && (
        <ReminderDialog
          isOpen={showReminderDialog}
          onClose={() => setShowReminderDialog(false)}
          noteTitle={title || 'New Note'}
          existingReminder={reminderData || undefined}
          onSave={handleSetReminder}
        />
      )}
    </>
  );
}