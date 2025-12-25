'use client';

import '@excalidraw/excalidraw/index.css';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lock, 
  Globe, 
  Bell,
  X,
  Link2,
  Trash2,
  Edit,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui-base/Button';
import { ReminderDialog } from '@/components/notes/ReminderDialog';
import { SmartCanvas } from './newCanvas/smartCanvas/index';
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
  description?: string;
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

const toCanvasBlock = (block: ApiBlock): any => ({
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
  fontSize: block.fontSize || 20,
});

const mapBodyToCanvas = (body: ApiBlock[] | undefined): any[] =>
  (body || []).map(toCanvasBlock);

export function UpdateContentDialog({ 
  isOpen, 
  onClose, 
  dashboardId,
  content,
  inline = true 
}: EditContentDialogProps) {
  const updateContentInStore = useDashboardStore((state) => state.updateContent);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newLinkInput, setNewLinkInput] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [canvasBlocks, setCanvasBlocks] = useState<any>({ blocks: [], connections: [] });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'Public' | 'Private'>('Private');
  const [reminderData, setReminderData] = useState<ReminderData | undefined>();
  const [links, setLinks] = useState<string[]>([]);
  const [sampleTags, setSampleTags] = useState(DEFAULT_TAGS);

  const [originalValues, setOriginalValues] = useState<{
    title: string;
    description: string;
    bodyJSON: string;
    bodyBlocks: any;
    tags: string[];
    visibility: 'Public' | 'Private';
    reminderData?: ReminderData;
    links: string[];
  } | null>(null);

  useEffect(() => {
    if (isOpen && content) {
      const initialTitle = content.title || '';
      const initialDescription = content.description || '';
      // Handle both legacy array format and new object format
      let initialBody: any;
      if (Array.isArray(content.body)) {
        initialBody = { blocks: mapBodyToCanvas(content.body), connections: [] };
      } else if (content.body && typeof content.body === 'object') {
        initialBody = {
          blocks: mapBodyToCanvas((content.body as any).blocks || []),
          connections: (content.body as any).connections || []
        };
      } else {
        initialBody = { blocks: [], connections: [] };
      }
      const initialTags = content.tags?.map(tag => tag.name) ?? [];
      const initialVisibility = content.visibility || 'Private';
      const initialReminderData = content.reminderData;
      const initialLinks = content.links || [];

      setTitle(initialTitle);
      setDescription(initialDescription);
      setCanvasBlocks(initialBody);
      setSelectedTags(initialTags);
      setVisibility(initialVisibility);
      setReminderData(initialReminderData);
      setLinks(initialLinks);
      
      setOriginalValues({
        title: initialTitle,
        description: initialDescription,
        bodyJSON: JSON.stringify(initialBody),
        bodyBlocks: JSON.parse(JSON.stringify(initialBody)),
        tags: [...initialTags],
        visibility: initialVisibility,
        reminderData: initialReminderData ? { ...initialReminderData } : undefined,
        links: [...initialLinks],
      });
      
      const customTags = (content.tags || [])
        .map(tag => tag.name)
        .filter(tagName => !DEFAULT_TAGS.includes(tagName));
      setSampleTags(Array.from(new Set([...DEFAULT_TAGS, ...customTags])));
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

  // Helper function to detect which blocks have changed
  const getChangedBlocks = (currentBlocks: any[], originalBlocks: any[]): { added: any[], modified: any[], deleted: string[] } => {
    const originalMap = new Map(originalBlocks.map(b => [b.blockId, b]));
    const currentMap = new Map(currentBlocks.map(b => [b.blockId, b]));
    
    const added: any[] = [];
    const modified: any[] = [];
    const deleted: string[] = [];

    // Check for added and modified blocks
    for (const [blockId, currentBlock] of currentMap) {
      if (!originalMap.has(blockId)) {
        added.push(currentBlock);
      } else {
        const originalBlock = originalMap.get(blockId)!;
        if (JSON.stringify(currentBlock) !== JSON.stringify(originalBlock)) {
          modified.push(currentBlock);
        }
      }
    }

    // Check for deleted blocks
    for (const blockId of originalMap.keys()) {
      if (!currentMap.has(blockId)) {
        deleted.push(blockId);
      }
    }

    return { added, modified, deleted };
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!originalValues) {
      toast.error('Original values not loaded');
      return;
    }

    const titleChanged = title.trim() !== originalValues.title;
    const descriptionChanged = description.trim() !== originalValues.description;
    
    // Extract blocks from the new format
    const currentBlocks = canvasBlocks?.blocks || [];
    const originalBlocks = originalValues.bodyBlocks?.blocks || [];
    const currentConnections = canvasBlocks?.connections || [];
    const originalConnections = originalValues.bodyBlocks?.connections || [];
    
    const changedBlocksInfo = getChangedBlocks(currentBlocks, originalBlocks);
    const connectionsChanged = JSON.stringify(currentConnections) !== JSON.stringify(originalConnections);
    const bodyChanged = changedBlocksInfo.added.length > 0 || changedBlocksInfo.modified.length > 0 || changedBlocksInfo.deleted.length > 0 || connectionsChanged;
    const tagsChanged = JSON.stringify([...selectedTags].sort()) !== JSON.stringify([...originalValues.tags].sort());
    const visibilityChanged = visibility !== originalValues.visibility;
    const linksChanged = JSON.stringify([...links].sort()) !== JSON.stringify([...originalValues.links].sort());
    const reminderChanged = JSON.stringify(reminderData) !== JSON.stringify(originalValues.reminderData);

    const hasAnyChanges = titleChanged || descriptionChanged || bodyChanged || tagsChanged || visibilityChanged || linksChanged || reminderChanged;

    if (!hasAnyChanges) {
      toast.info('No changes detected');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('DashId', dashboardId);

      if (titleChanged) {
        formData.append('title', title.trim());
      }

      if (descriptionChanged) {
        formData.append('description', description.trim());
      }

      if (tagsChanged) {
        formData.append('tags', JSON.stringify(selectedTags));
      }

      if (visibilityChanged) {
        formData.append('visibility', visibility);
      }

      if (linksChanged) {
        formData.append('links', JSON.stringify(links));
      }

      if (reminderChanged) {
        formData.append('reminderData', JSON.stringify(reminderData || null));
      }

      if (bodyChanged) {
        // 1. Prepare Upsert Blocks (Added + Modified)
        const upsertBlocks = [...changedBlocksInfo.added, ...changedBlocksInfo.modified].filter(
          block => !(block.type === 'text' && (!block.content || block.content.trim() === ''))
        );

        console.log('📤 upsertBlocks:', upsertBlocks);
        
        // 2. Prepare Final Block Order (All current block IDs)
        const finalBlockOrder = currentBlocks.map((b: any) => b.blockId);

        const imageBlockIds: string[] = [];
        
        // Process images for blocks that need uploading
        for (let i = upsertBlocks.length - 1; i >= 0; i--) {
          const block = upsertBlocks[i];

          if (block.type === 'image' && !block.isUploaded && block.imageId) {
            const blob = await imageStorage.getImage(block.imageId);

            if (blob) {
              const file = new File([blob], `image_${block.blockId}.png`, { type: blob.type });
              formData.append(`image_${block.blockId}`, file);
              imageBlockIds.push(block.blockId);

              upsertBlocks[i] = {
                ...block,
                url: 'PENDING_UPLOAD',
              };
            }
          }
        }
        
        if (imageBlockIds.length > 0) {
          formData.append('imageBlockIds', JSON.stringify(imageBlockIds));
        }
        
        // Send optimized block data
        formData.append('upsertBlocks', JSON.stringify(upsertBlocks));
        formData.append('finalBlockOrder', JSON.stringify(finalBlockOrder));
        
        // Send connections data
        formData.append('connections', JSON.stringify(currentConnections));
      }

      console.log('📤 UPDATE REQUEST PAYLOAD:');
      console.log('─────────────────────────────────');
      console.log('Changes Detected:', {
        titleChanged,
        descriptionChanged,
        bodyChanged,
        tagsChanged,
        visibilityChanged,
        linksChanged,
        reminderChanged
      });
      if (bodyChanged) {
        console.log('Block Optimization:', {
          upsertCount: changedBlocksInfo.added.length + changedBlocksInfo.modified.length,
          totalBlocksInOrder: currentBlocks.length,
          connectionsCount: currentConnections.length
        });

      }
      
      const response = await axiosInstance.patch(
        `/api/update-content/${content._id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      console.log('📤 UPDATE RESPONSE:', response.data);

      if (response.data?.success && response.data?.data) {
        updateContentInStore(dashboardId, content._id, response.data.data);
        toast.success('Note updated successfully!');
        handleClose();
      } else {
        throw new Error('Invalid response from server');
      }
      
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
    const blocks = canvasBlocks?.blocks || [];
    blocks.forEach((block: any) => {
      if (block.type === 'image' && block.url?.startsWith('blob:')) {
        imageStorage.revokeObjectURL(block.url);
      }
    });
    
    setTitle('');
    setDescription('');
    setCanvasBlocks({ blocks: [], connections: [] });
    setSelectedTags([]);
    setVisibility('Private');
    setReminderData(undefined);
    setLinks([]);
    setNewTagInput('');
    setNewLinkInput('');
    setSampleTags(DEFAULT_TAGS);
    setOriginalValues(null);
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
    ? 'w-full max-w-7xl mx-auto bg-[hsl(var(--card))] rounded-2xl shadow-lg border-2 border-[hsl(var(--brand-primary))]/30 flex flex-col'
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
          <div className={inline 
            ? 'p-5 border-b border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--brand-primary))]/5 to-transparent flex items-center justify-between' 
            : 'flex items-center justify-between p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]'
          }>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--brand-primary))]/10 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-[hsl(var(--brand-primary))]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
                    Edit Note
                  </h2>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border border-[hsl(var(--brand-primary))]/30">
                    Editing
                  </span>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                  Make changes to your note
                </p>
              </div>
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
                className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white shadow-lg h-9"
                size="sm"
              >
                Save Changes
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 pt-4 space-y-6">
            <div className="flex flex-col gap-2">
              <div className='flex w-full gap-4'>
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

            <div 
              className="border-2 border-[hsl(var(--border))] rounded-xl overflow-hidden transition-colors bg-[hsl(var(--card))]"
              style={inline 
                ? { minHeight: 220, height: 'clamp(340px,50vh,540px)' } 
                : { height: '300px' }
              }
            >
              <SmartCanvas
                initialContent={JSON.stringify(canvasBlocks)}
                onChange={useCallback((content: string) => {
                  try {
                    const parsed = JSON.parse(content);
                    setCanvasBlocks(parsed);
                  } catch (e) {
                    console.error("Failed to parse canvas blocks", e);
                  }
                }, [])}
                readOnly={false}
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
