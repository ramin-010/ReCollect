'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Pin, RefreshCw } from 'lucide-react';
import { NoteFinder } from '@/components/learning/NoteFinder';
import { toast } from 'sonner';
import { TaskInput } from './task_Input';
import { useTodoStore, type Todo } from '@/lib/store/todoStore';
import { useDocStore } from '@/lib/store/docStore';
import { useLearningStore } from '@/lib/store/learningStore';
import { learningApi } from '@/lib/api/learningApi';
import type { Attachment, SubjectWithTopics } from '@/lib/learning/types';
import { CaptureComposer, type CaptureComposerHandle } from '@/components/learning/CaptureComposer';
import { SubjectPicker } from '@/components/learning/SubjectPicker';
import { cn } from '@/lib/utils';

interface QuickTaskAddProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaletteMode = 'task' | 'note' | 'link' | 'find';
type Goal = 'NONE' | 'WEEKLY' | 'MONTHLY';

// Theme v2: sentence case, theme tokens (light + dark), controls grouped in floating pills over a plain dim.
const pill = (on: boolean) =>
  cn(
    'h-[26px] px-2.5 rounded-[6px] text-[13px] font-[500] transition-colors duration-100',
    on ? 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]' : 'text-[var(--ui-ink-3)] hover:text-[var(--ui-ink-1)]',
  );
const iconToggle = (on: boolean) =>
  cn(
    'grid h-[26px] w-[26px] place-items-center rounded-[6px] transition-colors',
    on ? 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]' : 'text-[var(--ui-icon)] hover:text-[var(--ui-ink-1)] hover:bg-[var(--ui-hover)]',
  );
/** A floating group of controls (popover surface + hairline ring + soft shadow). */
const floatPill = 'flex items-center gap-0.5 p-[3px] rounded-[9px] bg-[hsl(var(--popover))] shadow-[0_0_0_1px_var(--border-subtle),0_6px_16px_-4px_rgba(0,0,0,0.18)]';
const MODE_LABEL = { task: 'Task', note: 'Note', link: 'Link', find: 'Find' } as const;

/**
 * Ctrl+K: ONE palette (LEARNING_SPEC §4). Task mode is the existing quick add (TaskInput,
 * unchanged) plus a This week / This month chip; Note / Link mode is the capture composer;
 * ↻ "Revise this" saves a capture and starts its revisions (switching Task → Note, since todos
 * can't be revised). Find (loop v2 §8) searches the quick notes and copies one; Ctrl+K again
 * inside the palette switches to it.
 */
export function QuickTaskAdd({ isOpen, onClose }: QuickTaskAddProps) {
  const [mounted, setMounted] = useState(false);
  const { addTodo } = useTodoStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<CaptureComposerHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const currentDoc = useDocStore((s) => s.currentDoc);

  const [mode, setMode] = useState<PaletteMode>('task');
  const [revise, setRevise] = useState(false);
  const [goal, setGoal] = useState<Goal>('NONE');
  const [isPinned, setIsPinned] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [subjects, setSubjects] = useState<SubjectWithTopics[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset on every open (adjusting state while rendering, not in an effect).
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setMode('task');
      setRevise(false);
      setGoal('NONE');
      setIsPinned(false);
      setAttachments([]);
      setSubjectId(null);
      setTopicId(null);
    }
  }

  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure modal animation/render is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subjects for the picker, and on /docs the open doc's topic as the default level.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    learningApi
      .getSubjects()
      .then((s) => !cancelled && setSubjects(s))
      .catch(() => {
        /* learning backend not available: the picker just offers Inbox */
      });
    // On a doc page (/docs/:id), a capture defaults to that doc's subject and topic.
    const pageDocId = pathname?.startsWith('/docs/') ? decodeURIComponent(pathname.split('/')[2] ?? '') : null;
    const contextDocId = pageDocId || (pathname === '/docs' && currentDoc?._id && !currentDoc._id.startsWith('local_') ? currentDoc._id : null);
    if (contextDocId) {
      learningApi
        .getTopicByDoc(contextDocId)
        .then((r) => {
          if (cancelled || !r.topic) return;
          setSubjectId(r.topic.subjectId);
          setTopicId(r.topic._id);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, pathname, currentDoc?._id]);

  // Ctrl+K again while the palette is open: find a note (the note composer keeps Ctrl+K for links).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && mode !== 'find') {
        e.preventDefault();
        setMode('find');
        setRevise(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, mode]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSave = useCallback((data: { _id?: string }) => {
    if (data._id) {
      addTodo(data as unknown as Todo);
    }
    const learning = useLearningStore.getState();
    if (learning.isHomeMounted) void learning.refresh();
    onClose();
  }, [addTodo, onClose]);

  const switchMode = (next: PaletteMode) => {
    setMode(next);
    if (next === 'task' || next === 'find') setRevise(false);
    if (next === 'find') return;
    setTimeout(() => (next === 'task' ? inputRef.current?.focus() : composerRef.current?.focus()), 30);
  };

  const toggleRevise = () => {
    const next = !revise;
    setRevise(next);
    // Todos can't be revised: ↻ in Task mode switches to Note.
    if (next && mode === 'task') switchMode('note');
  };

  const upload = async (file: File) => {
    if (mode === 'task') setMode('note');
    setUploading((n) => n + 1);
    try {
      const att = await learningApi.uploadLearningFile(file);
      setAttachments((prev) => [...prev, att]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading((n) => n - 1);
    }
  };

  if (!mounted) return null;

  const isCapture = mode === 'note' || mode === 'link';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-[var(--overlay-mask)] z-[100]"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[101] px-4 sm:px-0"
          >
            {/* Top row: mode · ↻ Revise this · goal / subject · pin + attach */}
            <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <div className={floatPill} role="tablist" aria-label="Capture type">
                  {(['task', 'note', 'link', 'find'] as const).map((m) => (
                    <button key={m} role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className={pill(mode === m)}>
                      {MODE_LABEL[m]}
                    </button>
                  ))}
                </div>
                {mode !== 'find' && (
                <button
                  onClick={toggleRevise}
                  aria-pressed={revise}
                  className={cn(
                    'flex h-[32px] items-center gap-1.5 px-3 rounded-[9px] text-[13px] font-[500] transition-colors shadow-[0_0_0_1px_var(--border-subtle),0_6px_16px_-4px_rgba(0,0,0,0.18)]',
                    revise ? 'bg-[var(--ui-stamp-tint)] text-[var(--ui-stamp-ink)]' : 'bg-[hsl(var(--popover))] text-[var(--ui-ink-3)] hover:text-[var(--ui-ink-1)]',
                  )}
                  title="Revise this: schedule spaced-repetition revisions (+1, +3, +7, +21 days)"
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} /> Revise this
                </button>
                )}
                {mode === 'task' && (
                  <div className={floatPill} title="Plan it for this week or this month">
                    {(['NONE', 'WEEKLY', 'MONTHLY'] as const).map((g) => (
                      <button key={g} onClick={() => setGoal(g)} className={pill(goal === g)}>
                        {g === 'NONE' ? 'Anytime' : g === 'WEEKLY' ? 'This week' : 'This month'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isCapture && (
                <div className={floatPill}>
                  <SubjectPicker
                    subjects={subjects}
                    subjectId={subjectId}
                    topicId={topicId}
                    onChange={(s, t) => {
                      setSubjectId(s);
                      setTopicId(t);
                    }}
                  />
                  <button onClick={() => setIsPinned((p) => !p)} aria-pressed={isPinned} className={iconToggle(isPinned)} title="Pin to top" aria-label="Pin to top">
                    <Pin className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                  <button onClick={() => fileRef.current?.click()} className={iconToggle(attachments.length > 0)} title="Attach a file" aria-label="Attach a file">
                    <Paperclip className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      Array.from(e.target.files ?? []).forEach((f) => void upload(f));
                      e.target.value = '';
                    }}
                  />
                </div>
              )}
            </div>

            {mode === 'find' ? (
              <NoteFinder onClose={onClose} />
            ) : mode === 'task' ? (
              /* Task Input (unchanged quick add) */
              <TaskInput
                ref={inputRef}
                onSave={handleSave}
                isExpanded={true}
                onExpandChange={() => {}}
                isQuickAdd={true}
                onClose={onClose}
                goalType={goal}
              />
            ) : (
              <CaptureComposer
                ref={composerRef}
                mode={mode}
                revise={revise}
                subjectId={subjectId}
                topicId={topicId}
                isPinned={isPinned}
                attachments={attachments}
                isUploading={uploading > 0}
                onRemoveAttachment={(i) => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                onPasteFile={(f) => void upload(f)}
                onSaved={onClose}
              />
            )}

            {/* Keyboard hints */}
            <div className="mt-3 flex justify-center">
              <div className={cn(floatPill, 'gap-5 px-3 h-[32px] text-[12.5px] text-[var(--ui-ink-3)]')}>
                <span className="flex items-center gap-1.5">
                  <kbd className="grid h-[18px] min-w-[18px] place-items-center rounded-[4px] bg-[var(--ui-kbd)] px-1 font-[inherit] text-[12px] text-[var(--ui-ink-2)]">↵</kbd>
                  {mode === 'task' ? 'Create' : mode === 'find' ? 'Copy' : 'Save'}
                </span>
                {mode === 'find' && (
                  <span className="flex items-center gap-1.5">
                    <kbd className="grid h-[18px] min-w-[18px] place-items-center rounded-[4px] bg-[var(--ui-kbd)] px-1 font-[inherit] text-[12px] text-[var(--ui-ink-2)]">↑↓</kbd>
                    Choose
                  </span>
                )}
                {mode === 'task' && (
                  <span className="flex items-center gap-1.5">
                    <kbd className="grid h-[18px] place-items-center rounded-[4px] bg-[var(--ui-kbd)] px-1 font-[inherit] text-[12px] text-[var(--ui-ink-2)]">Ctrl K</kbd>
                    Find a note
                  </span>
                )}
                {isCapture && (
                  <span className="flex items-center gap-1.5">
                    <kbd className="grid h-[18px] place-items-center rounded-[4px] bg-[var(--ui-kbd)] px-1 font-[inherit] text-[12px] text-[var(--ui-ink-2)]">⇧↵</kbd>
                    New line
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <kbd className="grid h-[18px] place-items-center rounded-[4px] bg-[var(--ui-kbd)] px-1 font-[inherit] text-[12px] text-[var(--ui-ink-2)]">Esc</kbd>
                  Cancel
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
