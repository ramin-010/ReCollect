'use client';

import '@excalidraw/excalidraw/index.css';
import React, { useState, useEffect } from 'react';
import { Lock, Globe, Bell, X, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui-base/Button';
import { ReminderDialog } from '@/components/notes/ReminderDialog';
import { ContentCanvas, Block as CanvasBlock } from './contentCanvas';

export interface ReminderData {
  reminderDate: string;
  message?: string;
}

interface ContentDialogStateController {
  title: string;
  canvasBlocks: CanvasBlock[];
  selectedTags: string[];
  visibility: 'Public' | 'Private';
  reminderData?: ReminderData;
  links: string[];
  setTitle: (value: string) => void;
  setCanvasBlocks: (blocks: CanvasBlock[]) => void;
  setSelectedTags: (updater: string[] | ((prev: string[]) => string[])) => void;
  setVisibility: (value: 'Public' | 'Private') => void;
  setReminderData: (value?: ReminderData) => void;
  setLinks: (updater: string[] | ((prev: string[]) => string[])) => void;
}

const DEFAULT_TAGS = ['work', 'personal', 'ideas', 'todo'];
const MAX_TAGS = 5;
const MAX_LINKS = 2;

interface ContentDialogBaseProps {
  mode: 'create' | 'update';
  isOpen: boolean;
  inline?: boolean;
  dashboardId: string;
  onClose: () => void;
  onSubmit: () => Promise<void> | void;
  isLoading: boolean;
  headerTitle: string;
  headerSubtitle: string;
  primaryLabel: string;
  stateController: ContentDialogStateController;
}

export function ContentDialogBase({
  mode,
  isOpen,
  inline = false,
  onClose,
  onSubmit,
  isLoading,
  headerTitle,
  headerSubtitle,
  primaryLabel,
  stateController,
}: ContentDialogBaseProps) {
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newLinkInput, setNewLinkInput] = useState('');
  const [sampleTags, setSampleTags] = useState(DEFAULT_TAGS);

  useEffect(() => {
    const customTags = stateController.selectedTags.filter((tag) => !DEFAULT_TAGS.includes(tag));
    setSampleTags([...DEFAULT_TAGS, ...customTags]);
  }, [stateController.selectedTags]);

  const toggleTag = (tag: string) => {
    const isDefaultTag = DEFAULT_TAGS.includes(tag);
    stateController.setSelectedTags((prevTags) => {
      if (prevTags.includes(tag)) {
        if (!isDefaultTag) {
          setSampleTags((current) => current.filter((t) => t !== tag));
        }
        return prevTags.filter((t) => t !== tag);
      }
      if (prevTags.length >= MAX_TAGS) {
        toast.error(`Maximum ${MAX_TAGS} tags allowed`);
        return prevTags;
      }
      return [...prevTags, tag];
    });
  };

  const addCustomTag = () => {
    const trimmedTag = newTagInput.trim().toLowerCase();
    if (!trimmedTag) return;
    if (sampleTags.includes(trimmedTag)) {
      toast.error('Tag already exists');
      return;
    }
    if (stateController.selectedTags.length >= MAX_TAGS) {
      toast.error(`Maximum ${MAX_TAGS} tags allowed`);
      return;
    }
    setSampleTags([...sampleTags, trimmedTag]);
    stateController.setSelectedTags([...stateController.selectedTags, trimmedTag]);
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
    if (stateController.links.length >= MAX_LINKS) {
      toast.error(`Maximum ${MAX_LINKS} links allowed`);
      return;
    }
    stateController.setLinks([...stateController.links, trimmedLink]);
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
    stateController.setLinks(stateController.links.filter((_, i) => i !== index));
  };

  const handlePrimaryAction = () => {
    if (!stateController.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    onSubmit();
  };

  if (!isOpen && !inline) return null;

  const containerClass = inline
    ? 'w-full max-w-7xl mx-auto bg-[hsl(var(--card))] rounded-2xl shadow-lg border border-[hsl(var(--border))] flex flex-col'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none';
  const innerClass = inline
    ? 'flex flex-col pointer-events-auto'
    : 'w-full max-w-3xl bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] flex flex-col max-h-[85vh] pointer-events-auto';

  return (
    <>
      {!inline && <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />}
      <div className={containerClass} style={inline ? {} : undefined}>
        <div className={innerClass} onClick={inline ? undefined : (e) => e.stopPropagation()}>
          <div className={inline ? 'p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center justify-between' : 'flex items-center justify-between p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]'}>
            <div>
              <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">{headerTitle}</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{headerSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {!inline && (
                <button onClick={onClose} className="w-9 h-9 rounded-lg bg-[hsl(var(--sidebar-hover))] hover:bg-[hsl(var(--sidebar-active))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              )}
              <Button variant="ghost" onClick={onClose} disabled={isLoading} size="sm" className="h-9">
                Cancel
              </Button>
              <Button variant="primary" onClick={handlePrimaryAction} isLoading={isLoading} disabled={isLoading || !stateController.title.trim()} className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg h-9" size="sm">
                {primaryLabel}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 pt-4 space-y-6">
            <div className="flex flex-col gap-2">
              <div className="flex w-full gap-4">
                <div className="w-[70%] pr-10">
                  <input
                    type="text"
                    placeholder="Note title..."
                    value={stateController.title}
                    onChange={(e) => stateController.setTitle(e.target.value)}
                    className="w-full text-[40px] pb-4 font-semibold bg-transparent text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none"
                  />
                </div>
                <div className="w-[30%]">
                  {stateController.links.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {stateController.links.map((link, index) => (
                        <div key={index} className="flex items-center gap-1 p-1 pl-2 bg-[hsl(var(--brand-primary))]/10 border border-[hsl(var(--brand-primary))] rounded-lg group hover:border-[hsl(var(--muted-foreground))]/50 transition-all">
                          <Link2 className="w-3.5 h-3.5 text-[hsl(var(--brand-primary))] shrink-0" />
                          <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1 text-[11px] text-[hsl(var(--brand-primary))] hover:underline truncate">
                            {link}
                          </a>
                          <button onClick={() => removeLink(index)} className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-all">
                            <Trash2 className="w-[15px] h-[15px] mx-1" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-[15px] font-semibold tracking-wide text-[hsl(var(--muted-foreground))]">Tags</label>
                <div className="flex items-start gap-4 w-full">
                  <div className="w-[70%]">
                    <div className="flex flex-wrap gap-2">
                      {sampleTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${stateController.selectedTags.includes(tag) ? 'bg-blue-500/70 text-white border border-[hsl(var(--brand-primary))]/10' : 'bg-[hsl(var(--surface-light))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]/50'}`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w-[30%] flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => stateController.setVisibility(stateController.visibility === 'Private' ? 'Public' : 'Private')}
                      className={`flex items-center justify-center gap-2 w-full px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${stateController.visibility === 'Public' ? 'bg-[hsl(var(--brand-primary))]/10 border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))]' : 'bg-[hsl(0_65%_55%)]/10 border-[hsl(0_55%_35%)] text-[hsl(0_65%_55%)]'}`}
                    >
                      {stateController.visibility === 'Private' ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                      {stateController.visibility}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReminderDialog(true)}
                      className={`flex items-center justify-center gap-2 w-full px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${stateController.reminderData ? 'bg-[hsl(var(--brand-primary))]/10 border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))]' : 'bg-[hsl(var(--surface-light))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--muted-foreground))]/50'}`}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      {stateController.reminderData ? 'Reminder Set' : 'Set Reminder'}
                      {stateController.reminderData && <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse ml-1" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 items-end mt-2">
                  <input
                    type="text"
                    placeholder="Add custom tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    className="flex-1 px-3 py-2 rounded-lg bg-[hsl(var(--surface-light))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--brand-primary))]/50 focus:ring-2 focus:ring-[hsl(var(--brand-primary))]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    disabled={!newTagInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Add
                  </button>
                </div>
                <div className="flex gap-3 items-center w-full">
                  <div className="w-full">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Add important links"
                        value={newLinkInput}
                        onChange={(e) => setNewLinkInput(e.target.value)}
                        onKeyDown={handleLinkInputKeyDown}
                        className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--surface-light))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--brand-primary))]/50 focus:ring-2 focus:ring-[hsl(var(--brand-primary))]/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={addLink}
                        disabled={!newLinkInput.trim() || stateController.links.length >= MAX_LINKS}
                        className="px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl overflow-hidden transition-colors" style={inline ? { minHeight: 220, height: 'clamp(340px,50vh,540px)' } : { height: '300px' }}>
                <ContentCanvas initialBlocks={stateController.canvasBlocks} onSave={(blocks) => stateController.setCanvasBlocks(blocks)} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {showReminderDialog && (
        <ReminderDialog
          isOpen={showReminderDialog}
          onClose={() => setShowReminderDialog(false)}
          noteTitle={stateController.title || 'Note'}
          existingReminder={stateController.reminderData}
          onSave={async (data) => {
            stateController.setReminderData(data);
            setShowReminderDialog(false);
            await toast.success(mode === 'create' ? 'Reminder set for this note' : 'Reminder updated for this note');
          }}
        />
      )}
    </>
  );
}
