'use client';

import { useState } from 'react';
import { FolderPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import type { Subject } from '@/lib/learning/types';
import { LearningDialog } from './LearningDialog';
import { lx } from './styles';

/** Revise CreateSubjectModal: name + optional description; new subjects get '#007acc'. */
export function CreateSubjectDialog({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated?: (s: Subject) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error('Subject name is required');
      return;
    }
    setIsSaving(true);
    try {
      const subject = await learningApi.createSubject({ name: name.trim(), description: description.trim() || undefined, color: '#007acc' });
      toast.success('Subject created successfully');
      setName('');
      setDescription('');
      onCreated?.(subject);
      if (useLearningStore.getState().isHomeMounted) void useLearningStore.getState().refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create subject');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LearningDialog
      isOpen={isOpen}
      onClose={onClose}
      busy={isSaving}
      width="max-w-[460px]"
      icon={<FolderPlus className={cn('w-5 h-5', lx.primaryText)} />}
      title="Create New Subject"
      footer={
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className={cn('px-5 py-2.5 text-sm font-medium rounded-xl transition-all hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)}>
            Cancel
          </button>
          <button onClick={() => void save()} disabled={isSaving || !name.trim()} className={cn('flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed', lx.primaryBg)}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Subject
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
          }}
          placeholder="Subject Name (e.g., System Design)"
          className={cn(lx.input, 'px-4 py-3 bg-[var(--surface-elevated)]')}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe what you'll learn here... (optional)"
          rows={2}
          className={cn(lx.input, 'px-4 py-3 resize-none bg-[var(--surface-elevated)]')}
        />
      </div>
    </LearningDialog>
  );
}
