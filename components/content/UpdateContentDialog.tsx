'use client';

import '@excalidraw/excalidraw/index.css';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Lock, 
  Globe, 
  Bell,
  X,
  Link2,
  Tag as TagIcon,
  Maximize2,
  Minimize2,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  if (value === 'auto' || value === undefined || value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Calculate a reasonable default height for text blocks based on content length
const getTextBlockHeight = (content?: string): number => {
  if (!content) return 50;
  // Estimate: ~50 chars per line at default width, ~24px per line
  const estimatedLines = Math.max(1, Math.ceil(content.length / 30));
  return Math.max(50, Math.min(estimatedLines * 28 + 40, 400)); // Min 50, max 400
};

const toCanvasBlock = (block: ApiBlock): any => {
  // Recursively map stackItems if present
  const stackItems = (block as any).stackItems?.map((item: any) => ({
    blockId: item.blockId,
    type: item.type,
    content: item.content,
    url: item.url,
    imageId: item.imageId,
    isUploaded: item.isUploaded,
  })) || undefined;
  
  return {
    blockId: block.blockId,
    type: block.type,
    x: parseNumber(block.x, 100),
    y: parseNumber(block.y, 100),
    width: parseNumber(block.width, 300),
    height: parseNumber(block.height, block.type === 'text' ? getTextBlockHeight(block.content) : 200),
    content: block.content,
    url: block.url,
    imageId: block.imageId,
    isUploaded: block.isUploaded,
    fontSize: block.fontSize || 20,
    color: (block as any).color,
    stackItems: stackItems,
  };
};

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
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newLinkInput, setNewLinkInput] = useState('');
  
  // Debounce timer for canvas onChange to prevent dialog re-renders
  const canvasDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
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
      
      // Get connections from top-level content.connections (not inside body)
      const topLevelConnections = (content as any).connections || [];
      
      // Handle both legacy array format and new object format for blocks
      let initialBody: any;
      if (Array.isArray(content.body)) {
        // Legacy: body is an array of blocks, connections are at top level
        initialBody = { blocks: mapBodyToCanvas(content.body), connections: topLevelConnections };
      } else if (content.body && typeof content.body === 'object') {
        // New format: body could have blocks inside, or be the blocks array itself
        const bodyBlocks = (content.body as any).blocks || [];
        // Connections can be in body OR at top level - prefer top level
        const bodyConnections = (content.body as any).connections || [];
        initialBody = {
          blocks: mapBodyToCanvas(bodyBlocks),
          connections: topLevelConnections.length > 0 ? topLevelConnections : bodyConnections
        };
      } else {
        initialBody = { blocks: [], connections: topLevelConnections };
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

      const response = await axiosInstance.patch(
        `/api/update-content/${content._id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

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
                      disabled={!title.trim()}
                      className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg h-9"
                      size="sm"
                    >
                      Save Changes
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
                <SmartCanvas
                  initialContent={JSON.stringify(canvasBlocks)}
                  onChange={useCallback((content: string) => {
                    // Debounce parent state updates to prevent dialog re-renders during editing
                    if (canvasDebounceRef.current) {
                      clearTimeout(canvasDebounceRef.current);
                    }
                    canvasDebounceRef.current = setTimeout(() => {
                      try {
                        const parsed = JSON.parse(content);
                        setCanvasBlocks(parsed);
                      } catch (e) {
                        console.error("Failed to parse canvas blocks", e);
                      }
                    }, 2000); // 2 second debounce
                  }, [])}
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
                    <TagIcon className="w-3.5 h-3.5" />
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
                      className="min-w-[60px] w-auto border border-[hsl(var(--border))] rounded-md px-2 py-0.5 text-[10px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/50 focus:outline-none text-right focus:placeholder:text-[hsl(var(--muted-foreground))]/30 transition-all"
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
          noteTitle={title || 'Note'}
          existingReminder={reminderData}
          onSave={handleSetReminder}
        />
      )}
    </>
  );
}