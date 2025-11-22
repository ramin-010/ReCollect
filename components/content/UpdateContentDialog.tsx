'use client';

import '@excalidraw/excalidraw/index.css';
import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Globe, 
  Bell,
  X,
  Link2,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui-base/Button';
import { ReminderDialog } from '@/components/notes/ReminderDialog';
import { ContentCanvas, Block as CanvasBlock } from './contentCanvas';
import axios from 'axios';
import axiosInstance from '@/lib/utils/axios';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { imageStorage } from '@/lib/storage/imageStorage';
import { Tag, Block as ApiBlock } from '@/lib/utils/types';

interface ReminderData {
  reminderDate: string;
  message?: string;
}

interface ContentToEdit {
  _id: string;
  title: string;
  body: ApiBlock[];
  tags: Tag[];
  links: string[];
  visibility: 'Public' | 'Private';
  reminderData?: ReminderData;
}

interface EditContentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  content: ContentToEdit;
  inline?: boolean;
}

const DEFAULT_TAGS = ['work', 'personal', 'ideas', 'todo'];
const MAX_TAGS = 5;
const MAX_LINKS = 2;

const parseNumber = (value: string | number | undefined, fallback: number) => {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toCanvasBlock = (block: ApiBlock): CanvasBlock => ({
  blockId: block.blockId,
  type: block.type,
  x: parseNumber(block.x, 100),
  y: parseNumber(block.y, 100),
  width: parseNumber(block.width, 300),
  height: parseNumber(block.height, block.type === 'text' ? 30 : 200),
  content: block.content,
  url: block.url,
  imageId: block.imageId,
  isUploaded: block.isUploaded,
});

const mapBodyToCanvas = (body: ApiBlock[] | undefined): CanvasBlock[] =>
  (body || []).map(toCanvasBlock);

export function UpdateContentDialog({ 
  isOpen, 
  onClose, 
  dashboardId,
  content,
  inline = false 
}: EditContentDialogProps) {
  const updateContentInStore = useDashboardStore((state) => state.updateContent);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newLinkInput, setNewLinkInput] = useState('');
  
  // State initialized from content prop
  const [title, setTitle] = useState('');
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'Public' | 'Private'>('Private');
  const [reminderData, setReminderData] = useState<ReminderData | undefined>();
  const [links, setLinks] = useState<string[]>([]);
  const [sampleTags, setSampleTags] = useState(DEFAULT_TAGS);

  // Initialize state from content prop when dialog opens
  useEffect(() => {
    if (isOpen && content) {
      setTitle(content.title || '');
      setCanvasBlocks(mapBodyToCanvas(content.body));

      setSelectedTags(content.tags?.map(tag => tag.name) ?? []);

      setVisibility(content.visibility || 'Private');
      setReminderData(content.reminderData);
      setLinks(content.links || []);
      
      // Merge custom tags into sample tags
      const customTags = (content.tags || [])
        .map(tag => tag.name)
        .filter(tagName => !DEFAULT_TAGS.includes(tagName));
      setSampleTags([...DEFAULT_TAGS, ...customTags]);
    }
  }, [isOpen, content]);

  const toggleTag = (tag: string) => {
    const isDefaultTag = DEFAULT_TAGS.includes(tag);
    
    setSelectedTags((prevTags) => {
      if (prevTags.includes(tag)) {
        if (!isDefaultTag) {
          setSampleTags((current) => current.filter(t => t !== tag));
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
      const imageBlockIds: string[] = [];
      
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
      
      formData.append('imageBlockIds', JSON.stringify(imageBlockIds));
      formData.append('title', title.trim());
      formData.append('body', JSON.stringify(blocksToSave));
      formData.append('tags', JSON.stringify(selectedTags));
      formData.append('visibility', visibility);
      formData.append('links', JSON.stringify(links));
      formData.append('DashId', dashboardId);
      
      if (reminderData) {
        formData.append('reminderData', JSON.stringify(reminderData));
      }

      const response = await axiosInstance.put(
        `/api/update-content/${content._id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data?.success && response.data?.data) {
        updateContentInStore(dashboardId, content._id, response.data.data);
      }
      
      toast.success('Note updated successfully!');
      handleClose();
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message ?? error.message
        : (error instanceof Error ? error.message : 'Failed to update note');
      console.error('Failed to update content:', error);
      toast.error(errorMessage || 'Failed to update note');
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
    
    setTitle('');
    setCanvasBlocks([]);
    setSelectedTags([]);
    setVisibility('Private');
    setReminderData(undefined);
    setLinks([]);
    setNewTagInput('');
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
    toast.success('Reminder updated for this note');
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
          {/* Header */}
          <div className={inline 
            ? 'p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center justify-between' 
            : 'flex items-center justify-between p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]'
          }>
            <div>
              <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
                Update Note
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                Edit your note details
              </p>
            </div>
            
            <div className="flex items-center gap-2">
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
                disabled={!title.trim()}
                className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg h-9"
                size="sm"
              >
                Save Changes
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 pt-4 space-y-6">
            <div className="flex flex-col gap-2">
              {/* Title & Links Row */}
              <div className='flex w-full gap-4'>
                <div className="w-[70%] pr-10">
                  <input
                    type="text"
                    placeholder="Note title..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full text-[40px] pb-4 font-semibold bg-transparent text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none"
                  />
                </div>
                
                <div className="w-[30%]">
                  {links.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {links.map((link, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-1 p-1 pl-2 bg-[hsl(var(--brand-primary))]/10 border border-[hsl(var(--brand-primary))] rounded-lg group hover:border-[hsl(var(--muted-foreground))]/50 transition-all"
                        >
                          <Link2 className="w-3.5 h-3.5 text-[hsl(var(--brand-primary))] shrink-0" />
                          <a 
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-[11px] text-[hsl(var(--brand-primary))] hover:underline truncate"
                          >
                            {link}
                          </a>
                          <button
                            onClick={() => removeLink(index)}
                            className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-[15px] h-[15px] mx-1" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Section */}
              <div className="flex flex-col gap-3">
                <label className="text-[15px] font-semibold tracking-wide text-[hsl(var(--muted-foreground))]">
                  Tags
                </label>
                
                <div className="flex items-start gap-4 w-full">
                  <div className="w-[70%]">
                    <div className="flex flex-wrap gap-2">
                      {sampleTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                            selectedTags.includes(tag)
                              ? 'bg-blue-500/70 text-white border border-[hsl(var(--brand-primary))]/10'
                              : 'bg-[hsl(var(--surface-light))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]/50'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="w-[30%] flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibility(visibility === 'Private' ? 'Public' : 'Private')}
                      className={`flex items-center justify-center gap-2 w-full px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                        visibility === 'Public' 
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
                      className={`flex items-center justify-center gap-2 w-full px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                        reminderData 
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

                {/* Custom Tag Input */}
                <div className="flex gap-2 items-end mt-2">
                  <input
                    type="text"
                    placeholder="Add custom tag..."
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
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
              </div>
              
              {/* Links Input */}
              <div className="flex gap-3 items-center w-full">
                <div className="w-full">
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text"
                      placeholder="Add important links"
                      value={newLinkInput}
                      onChange={e => setNewLinkInput(e.target.value)}
                      onKeyDown={handleLinkInputKeyDown}
                      className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--surface-light))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--brand-primary))]/50 focus:ring-2 focus:ring-[hsl(var(--brand-primary))]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={addLink}
                      disabled={!newLinkInput.trim() || links.length >= MAX_LINKS}
                      className="px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div 
              className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl overflow-hidden transition-colors"
              style={inline 
                ? { minHeight: 220, height: 'clamp(340px,50vh,540px)' } 
                : { height: '300px' }
              }
            >
              <ContentCanvas
                initialBlocks={canvasBlocks}
                onSave={blocks => setCanvasBlocks(blocks)}
              />
            </div>
          </div>
        </div>
      </div>

      {showReminderDialog && (
        <ReminderDialog
          isOpen={showReminderDialog}
          onClose={() => setShowReminderDialog(false)}
          noteTitle={title || 'Note'}
          existingReminder={reminderData}
          onSave={handleSetReminder}
        />
      )}
    </>
  );
}