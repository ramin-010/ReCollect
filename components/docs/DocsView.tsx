'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, FileText, Search, Loader2, MoreHorizontal, 
  Trash2, Pin, PinOff
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { Card } from '@/components/ui-base/Card';
import { useDocStore, Doc } from '@/lib/store/docStore';
import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DocEditor } from './DocEditor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';

export function DocsView() {
  const { docs, currentDoc, isLoading, setDocs, addDoc, removeDoc, setCurrentDoc, setLoading, updateDoc } = useDocStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/docs');
      if (response.data.success) {
        setDocs(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch docs:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [setDocs, setLoading]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleCreateDoc = async () => {
    try {
      setIsCreating(true);
      const response = await axiosInstance.post('/api/docs', {
        title: '',
        emoji: ''
      });
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

  const handleDeleteDoc = async (doc: Doc) => {
    try {
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

  const handleTogglePin = async (doc: Doc) => {
    try {
      const response = await axiosInstance.patch(`/api/docs/${doc._id}`, {
        isPinned: !doc.isPinned
      });
      if (response.data.success) {
        updateDoc(doc._id, { isPinned: !doc.isPinned });
        toast.success(doc.isPinned ? 'Unpinned' : 'Pinned');
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const filteredDocs = docs.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentDoc) {
    return <DocEditor doc={currentDoc} onBack={() => setCurrentDoc(null)} />;
  }

  return (
    <div className="h-full flex flex-col p-8 overflow-hidden bg-[hsl(var(--background))] max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-500" />
            Docs
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
            Create and organize your documents
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreateDoc}
          leftIcon={isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          className="bg-amber-600 hover:bg-amber-700 text-white"
          disabled={isCreating}
        >
          New Document
        </Button>
      </div>

      <div className="relative mb-6 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[hsl(var(--muted))] border border-transparent focus:border-amber-500 text-sm outline-none transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
            <p className="text-lg font-medium">No documents yet</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Create your first document to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredDocs.map((doc) => (
                <motion.div
                  key={doc._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card
                    className="p-4 cursor-pointer hover:border-amber-500/50 transition-all group relative"
                    onClick={() => setCurrentDoc(doc)}
                  >
                    {doc.isPinned && (
                      <Pin className="absolute top-2 right-2 w-3.5 h-3.5 text-amber-500" />
                    )}
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{doc.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{doc.title}</h3>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                          {format(new Date(doc.updatedAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTogglePin(doc); }}>
                            {doc.isPinned ? (
                              <><PinOff className="w-4 h-4 mr-2" /> Unpin</>
                            ) : (
                              <><Pin className="w-4 h-4 mr-2" /> Pin</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            destructive
                            onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
