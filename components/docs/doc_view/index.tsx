'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, FileText, Search, Loader2, LayoutGrid, List,
  Filter, ArrowUpDown, ChevronDown, Star, Sparkles, File, Clock, Users, Share2
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui-base/Button';
import { useDocStore, Doc, DocType } from '@/lib/store/docStore';
import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';
import { DocEditor, CollaborativeDocEditor } from '../doc_editor';
import { SharedDocViewer } from '../SharedDocViewer';
import { ShareDialog } from '../ShareDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { offlineStorage } from '@/lib/utils/offlineStorage';

import { ViewMode, SortOption, OwnershipFilter } from './types';
import { GalleryCard } from './GalleryCard';
import { ListRow, NewPageCard } from './CardComponents';
import { SharedByMeSection } from './SharedByMeSection';

export function DocsView() {
  const { docs, currentDoc, isLoading, isInitialized, setDocs, addDoc, removeDoc, setCurrentDoc, setLoading, updateDoc } = useDocStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [shareDialog, setShareDialog] = useState({ open: false, docId: '', docTitle: '' });
  const [currentDocRole, setCurrentDocRole] = useState<'owner' | 'editor' | 'viewer'>('owner');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  
  const [sharedByMeDocs, setSharedByMeDocs] = useState<any[]>([]);
  const [isLoadingSharedByMe, setIsLoadingSharedByMe] = useState(false);

  const pinTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const fetchDocs = useCallback(async () => {
    if (isInitialized) return;

    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/docs');
      const serverDocs = response.data.success ? response.data.data : [];
      
      const allOfflineDocs = await offlineStorage.getAllOfflineDocs();
      const offlineContentMap = new Map(
        allOfflineDocs.map(od => [od.id, od])
      );
      
      const pendingDocs = allOfflineDocs.filter(pd => pd.id.startsWith('local_'));
      const localDocs = pendingDocs.map(pd => ({
        _id: pd.id,
        title: pd.title || 'Untitled',
        yjsState: pd.yjsState,
        isPinned: false,
        isArchived: false,
        createdAt: new Date(pd.updatedAt).toISOString(),
        updatedAt: new Date(pd.updatedAt).toISOString(),
      }));
      
      const mergedServerDocs = serverDocs.map((serverDoc: any) => {
        const offlineDoc = offlineContentMap.get(serverDoc._id);
        if (offlineDoc && offlineDoc.yjsState) {
          return {
            ...serverDoc,
            yjsState: offlineDoc.yjsState,
          };
        }
        return serverDoc;
      });
      
      setDocs([...localDocs, ...mergedServerDocs]);
    } catch (error) {
      console.error('Failed to fetch docs:', error);
      toast.error('Failed to load documents');
      setLoading(false);
    }
  }, [isInitialized, setDocs, setLoading]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const fetchSharedByMe = useCallback(async () => {
    try {
      setIsLoadingSharedByMe(true);
      const response = await axiosInstance.get('/api/docs/shared-by-me');
      if (response.data.success) {
        setSharedByMeDocs(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch shared docs:', error);
      toast.error('Failed to load shared docs');
    } finally {
      setIsLoadingSharedByMe(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'shared-by-me' && sharedByMeDocs.length === 0) {
      fetchSharedByMe();
    }
  }, [viewMode, sharedByMeDocs.length, fetchSharedByMe]);

  const handleCreateDoc = async () => {
    try {
      setIsCreating(true);
      const response = await axiosInstance.post('/api/docs', { title: '' });
      if (response.data.success) {
        addDoc(response.data.data);
        setCurrentDoc(response.data.data);
        toast.success('Document created');
      }
    } catch (error) {
      console.error('Failed to create doc:', error);
      toast.error('Failed to create document');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDoc = async (doc: Doc, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (doc._id.startsWith('local_')) {
        await offlineStorage.deleteDoc(doc._id);
        removeDoc(doc._id);
        toast.success('Document deleted');
        return;
      }
      const response = await axiosInstance.delete(`/api/docs/${doc._id}`);
      if (response.data.success) {
        removeDoc(doc._id);
        toast.success('Document deleted');
      }
    } catch (error) {
      console.error('Failed to delete doc:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleTogglePin = async (doc: Doc, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const newStatus = !doc.isPinned;
    updateDoc(doc._id, { isPinned: newStatus });
    
    if (doc._id.startsWith('local_')) {
      toast.success(newStatus ? 'Pinned (local)' : 'Unpinned (local)');
      return;
    }

    if (pinTimeouts.current[doc._id]) {
      clearTimeout(pinTimeouts.current[doc._id]);
    }

    pinTimeouts.current[doc._id] = setTimeout(async () => {
      try {
        const response = await axiosInstance.patch(`/api/docs/${doc._id}`, { isPinned: newStatus });
        if (!response.data.success) {
           throw new Error('Failed to update on server');
        }
        
        const updatedDoc = response.data.data;
        updateDoc(doc._id, { isPinned: newStatus, updatedAt: updatedDoc.updatedAt });
        
        const offlineDoc = await offlineStorage.loadDoc(doc._id);
        if (offlineDoc) {
          await offlineStorage.saveDoc(
            doc._id,
            offlineDoc.yjsState,
            offlineDoc.title,
            offlineDoc.coverImage,
            'synced',
            new Date(updatedDoc.updatedAt).getTime()
          );
        }
      } catch (error) {
        console.error('Failed to toggle pin:', error);
        updateDoc(doc._id, { isPinned: !newStatus }); 
        toast.error('Failed to update pin status');
      } finally {
        delete pinTimeouts.current[doc._id];
      }
    }, 500); 
  };

  const handleRenameDoc = useCallback(async (doc: Doc, newTitle: string) => {
      try {
        if (doc._id.startsWith('local_')) {
          await offlineStorage.saveDoc(doc._id, doc.yjsState || '', newTitle, doc.coverImage || null, 'pending');
          updateDoc(doc._id, { title: newTitle });
        } else {
          const response = await axiosInstance.patch(`/api/docs/${doc._id}`, { title: newTitle });
          if (response.data.success) {
            const updatedDoc = response.data.data;
            updateDoc(doc._id, { title: newTitle, updatedAt: updatedDoc.updatedAt });
            
            const offlineDoc = await offlineStorage.loadDoc(doc._id);
            if (offlineDoc) {
              await offlineStorage.saveDoc(
                doc._id,
                offlineDoc.yjsState,
                newTitle,
                offlineDoc.coverImage,
                'synced',
                new Date(updatedDoc.updatedAt).getTime()
              );
            }
          }
        }
      } catch (error) {
        console.error('Failed to save title:', error);
        toast.error('Failed to save title');
      }
  }, [updateDoc]);

  const handleChangeDocType = async (doc: Doc, newType: DocType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (doc._id.startsWith('local_')) {
      toast.info('Save the document first to change its type');
      return;
    }
    try {
      const response = await axiosInstance.patch(`/api/docs/${doc._id}`, { docType: newType });
      if (response.data.success) {
        const updatedDoc = response.data.data;
        updateDoc(doc._id, { docType: newType, updatedAt: updatedDoc.updatedAt });
        
        const offlineDoc = await offlineStorage.loadDoc(doc._id);
        if (offlineDoc) {
          await offlineStorage.saveDoc(
            doc._id,
            offlineDoc.yjsState,
            offlineDoc.title,
            offlineDoc.coverImage,
            'synced',
            new Date(updatedDoc.updatedAt).getTime()
          );
        }
        
        toast.success(`Changed to ${newType.charAt(0).toUpperCase() + newType.slice(1)}`);
      }
    } catch (error) {
      console.error('Failed to change doc type:', error);
      toast.error('Failed to change document type');
    }
  };

  const handleShareDoc = async (doc: Doc, e: React.MouseEvent) => {
    e.stopPropagation();
    if (doc._id.startsWith('local_')) {
      toast.info('Save the document first to share it');
      return;
    }
    setShareDialog({ open: true, docId: doc._id, docTitle: doc.title || 'Untitled' });
  };

  const filteredDocs = docs
    .filter((doc) => {
      const docRole = doc.role || 'owner';
      if (ownershipFilter === 'mine' && docRole !== 'owner') return false;
      if (ownershipFilter === 'shared' && docRole === 'owner') return false;
      
      return doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });

  const pinnedDocs = filteredDocs.filter(d => d.isPinned);
  const unpinnedDocs = filteredDocs.filter(d => !d.isPinned);
  const allSortedDocs = [...pinnedDocs, ...unpinnedDocs];

  const handleOpenDoc = useCallback((doc: Doc) => {
    const role = doc._id.startsWith('local_') ? 'owner' : (doc.role || 'owner');
    setCurrentDocRole(role);
    setCurrentDoc(doc);
  }, [setCurrentDoc]);

  const handleCloseDoc = useCallback(() => {
    setCurrentDoc(null);
    setCurrentDocRole('owner');
  }, [setCurrentDoc]);

  if (currentDoc) {
    // Viewer role - read-only access
    if (currentDocRole === 'viewer') {
      return (
        <SharedDocViewer 
          doc={{
            _id: currentDoc._id,
            title: currentDoc.title,
            yjsState: currentDoc.yjsState,
            coverImage: currentDoc.coverImage,
            updatedAt: currentDoc.updatedAt,
          }}
          mode="viewer"
          onBack={handleCloseDoc}
        />
      );
    }
    
    // Check if doc is shared (has collaborators or user is an editor collaborator)
    const isSharedDoc = (currentDoc.collaborators && currentDoc.collaborators.length > 0) || 
                        currentDocRole === 'editor';
    
    if (isSharedDoc) {
      // Use CollaborativeDocEditor with real-time WebSocket sync
      return <CollaborativeDocEditor doc={currentDoc} onBack={handleCloseDoc} />;
    }
    
    // Personal doc - use regular DocEditor with auto-save
    return <DocEditor doc={currentDoc} onBack={handleCloseDoc} />;
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      {/* Header Section */}
      <div className="shrink-0 px-8 pt-8 pb-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3 mb-1">
             <div className="w-10 h-10 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center">
               <FileText className="w-5 h-5 text-amber-500" />
             </div>
             <div>
               <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Docs</h1>
               <p className="text-sm text-[hsl(var(--muted-foreground))]">Organize and keep track of documents shared across your team.</p>
             </div>
        </div>
      </div>

      {/* View Tabs & Controls */}
      <div className="shrink-0 px-8 pb-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[hsl(var(--card-bg))] rounded-lg">
             <button onClick={() => setViewMode('gallery')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'gallery' ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>
               <LayoutGrid className="w-4 h-4" /> Gallery
             </button>
             <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>
               <List className="w-4 h-4" /> List
             </button>
             <button onClick={() => setViewMode('shared-by-me')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'shared-by-me' ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>
               <Share2 className="w-4 h-4" /> Shared by Me
             </button>
          </div>
          <div className="flex items-center gap-2">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
               <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48 pl-9 pr-3 py-1.5 rounded-md bg-[hsl(var(--card-bg))] border border-transparent focus:border-[hsl(var(--border))] focus:bg-[hsl(var(--card-bg))]/50 text-sm outline-none transition-all placeholder:text-[hsl(var(--muted-foreground))]" />
             </div>
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card-bg))] transition-colors">
                   <ArrowUpDown className="w-4 h-4" /> Sort
                 </button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-40">
                 <DropdownMenuItem onClick={() => setSortBy('updated')}>
                   <Clock className="w-4 h-4 mr-2" /> Last updated
                   {sortBy === 'updated' && <span className="ml-auto text-amber-500">✓</span>}
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSortBy('created')}>
                   <Sparkles className="w-4 h-4 mr-2" /> Date created
                   {sortBy === 'created' && <span className="ml-auto text-amber-500">✓</span>}
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSortBy('title')}>
                   <FileText className="w-4 h-4 mr-2" /> Title
                   {sortBy === 'title' && <span className="ml-auto text-amber-500">✓</span>}
                 </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card-bg))] transition-colors">
                    <Filter className="w-4 h-4" /> {ownershipFilter === 'all' ? 'All' : ownershipFilter === 'mine' ? 'My Docs' : 'Shared'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setOwnershipFilter('all')}>
                    <FileText className="w-4 h-4 mr-2" /> All Docs
                    {ownershipFilter === 'all' && <span className="ml-auto text-amber-500">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOwnershipFilter('mine')}>
                    <Star className="w-4 h-4 mr-2" /> My Docs
                    {ownershipFilter === 'mine' && <span className="ml-auto text-amber-500">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOwnershipFilter('shared')}>
                    <Users className="w-4 h-4 mr-2" /> Shared with Me
                    {ownershipFilter === 'shared' && <span className="ml-auto text-amber-500">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
             <Button onClick={handleCreateDoc} disabled={isCreating} className="bg-amber-600/70 text-white hover:bg-amber-600/80 border-0 gap-1.5" size="sm">
               {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> New <ChevronDown className="w-3.5 h-3.5" /></>}
             </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading documents...</p>
            </div>
          ) : allSortedDocs.length === 0 && !searchQuery ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-4">
                <File className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No documents yet</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-sm mx-auto">Get started by creating your first document.</p>
              <Button onClick={handleCreateDoc} className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Create Document
              </Button>
            </div>
          ) : viewMode === 'gallery' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allSortedDocs.map((doc, i) => (
                <motion.div key={doc._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }}>
                  <GalleryCard 
                    doc={doc} 
                    index={i} 
                    currentUserId={user?._id}
                    onOpen={handleOpenDoc}
                    onTogglePin={handleTogglePin}
                    onShare={handleShareDoc}
                    onDelete={handleDeleteDoc}
                    onChangeType={handleChangeDocType}
                    onRename={handleRenameDoc}
                  />
                </motion.div>
              ))}
              <NewPageCard onClick={handleCreateDoc} disabled={isCreating} />
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
               <div className="flex items-center gap-4 px-4 py-2.5 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))] text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                 <span className="w-4" /> <span className="flex-1">Name</span> <span className="w-20">Tag</span> <span className="w-24 text-right">Updated</span> <span className="w-16" />
               </div>
               <AnimatePresence>
                 {allSortedDocs.map((doc, i) => (
                   <ListRow 
                     key={doc._id} 
                     doc={doc} 
                     index={i} 
                     currentUserId={user?._id}
                     onOpen={handleOpenDoc} 
                     onTogglePin={handleTogglePin} 
                     onDelete={handleDeleteDoc}
                     onShare={handleShareDoc}
                     onChangeType={handleChangeDocType}
                     onRename={handleRenameDoc}
                   />
                 ))}
               </AnimatePresence>
               <button onClick={handleCreateDoc} disabled={isCreating} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[hsl(var(--muted))]/30 cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                 <Plus className="w-4 h-4" /> <span className="text-sm">New page</span>
               </button>
            </div>
          ) : (
            <SharedByMeSection 
              sharedByMeDocs={sharedByMeDocs}
              isLoading={isLoadingSharedByMe}
              onRefresh={fetchSharedByMe}
            />
          )}
          {searchQuery && allSortedDocs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No documents found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
      
      <ShareDialog 
        open={shareDialog.open} 
        onOpenChange={(open) => setShareDialog(prev => ({ ...prev, open }))}
        docId={shareDialog.docId}
        docTitle={shareDialog.docTitle}
      />
    </div>
  );
}

export default DocsView;
