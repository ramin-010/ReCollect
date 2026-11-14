'use client';

import { useCallback, useEffect, useState } from 'react';
import { Book, CheckCircle2, FolderPlus, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui-base/Popover';
import { useLearningStore } from '@/lib/store/learningStore';
import type { SubjectWithTopics, TopicByDoc } from '@/lib/learning/types';
import { CreateSubjectDialog } from './CreateSubjectDialog';

const base =
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-[hsl(var(--muted-foreground))]/30 group-hover/header:border-[hsl(var(--foreground))]/50 hover:bg-white/10 transition-colors text-xs text-[hsl(var(--muted-foreground))] group-hover/header:text-[hsl(var(--foreground))] disabled:opacity-60 disabled:hover:bg-white/5';

/**
 * Revise's topic-page RevisionButton, for a doc (LEARNING_SPEC §3 "Doc integration"). States
 * come from GET /api/topics/by-doc/:docId `nextAction`:
 *   start → pick a subject → POST /api/topics (starts +1/+3/+7/+21)
 *   due / early → POST /api/revisions/:id/complete ("Mark as revised" / "Revise early")
 *   wait → "Next revision in N days" · completed → "Mastered"
 * Hidden when the learning API is unavailable (e.g. before the backend ships it).
 */
export function DocRevisionButton({ docId }: { docId: string }) {
  const [info, setInfo] = useState<TopicByDoc | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [subjects, setSubjects] = useState<SubjectWithTopics[] | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setInfo(await learningApi.getTopicByDoc(docId));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [docId]);

  useEffect(() => {
    let cancelled = false;
    learningApi
      .getTopicByDoc(docId)
      .then((r) => !cancelled && setInfo(r))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [docId]);

  const openPicker = async (open: boolean) => {
    setIsPickerOpen(open);
    if (open && subjects === null) {
      try {
        setSubjects(await learningApi.getSubjects());
      } catch {
        setSubjects([]);
      }
    }
  };

  const start = async (subjectId: string) => {
    setIsPickerOpen(false);
    setBusy(true);
    try {
      await learningApi.createTopic({ docId, subjectId, startRevisions: true });
      toast.success('Revisions scheduled: +1, +3, +7 and +21 days');
      await load();
      const store = useLearningStore.getState();
      if (store.isHomeMounted) void store.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start revisions');
    } finally {
      setBusy(false);
    }
  };

  const complete = async (revisionId: string) => {
    setBusy(true);
    try {
      const res = await learningApi.completeRevision(revisionId);
      toast.success(res.mastered ? 'Mastered!' : 'Marked as revised');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not mark as revised');
    } finally {
      setBusy(false);
    }
  };

  if (failed || !info) return null;
  const action = info.nextAction;
  const spinner = <Loader2 className="w-3.5 h-3.5 animate-spin" />;

  if (action.kind === 'completed') {
    return (
      <span className={cn(base, 'cursor-default')} title="All four revision cycles done">
        <Trophy className="w-3.5 h-3.5 text-amber-400" /> Mastered
      </span>
    );
  }

  if (action.kind === 'wait') {
    return (
      <span className={cn(base, 'cursor-default')} title={`Cycle ${action.next.cycleNumber} of 4 on ${action.next.scheduledFor}`}>
        <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Next revision in {action.inDays} days
      </span>
    );
  }

  if (action.kind === 'due' || action.kind === 'early') {
    return (
      <button onClick={() => void complete(action.next._id)} disabled={busy} className={base} title={`Cycle ${action.next.cycleNumber} of 4`}>
        {busy ? spinner : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        {action.kind === 'due' ? 'Mark as revised' : 'Revise early'}
      </button>
    );
  }

  // start
  return (
    <>
      <Popover open={isPickerOpen} onOpenChange={(o) => void openPicker(o)}>
        <PopoverTrigger asChild>
          <button disabled={busy} className={base} title="Revise this: start spaced-repetition revisions for this doc">
            {busy ? spinner : <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />}
            Revise this
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-1 bg-[hsl(var(--card))] border border-[var(--border-subtle)] rounded-xl shadow-xl">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Add to subject</div>
          {subjects === null ? (
            <div className="flex items-center justify-center py-4 text-[hsl(var(--muted-foreground))]">{spinner}</div>
          ) : (
            <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
              {subjects.map((s) => (
                <button
                  key={s._id}
                  onClick={() => void start(s._id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-[12px] font-medium text-[hsl(var(--foreground))]/80 hover:bg-[var(--surface-raised)]"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color ?? '#007acc' }} />
                  <Book className="w-3.5 h-3.5 opacity-60" />
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
              {subjects.length === 0 && <div className="px-2 py-2 text-[11px] text-[hsl(var(--muted-foreground))]">No subjects yet.</div>}
            </div>
          )}
          <div className="my-1 h-px bg-[var(--border-subtle)]" />
          <button
            onClick={() => {
              setIsPickerOpen(false);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-[12px] font-medium text-[hsl(var(--primary))] hover:bg-[var(--surface-raised)]"
          >
            <FolderPlus className="w-3.5 h-3.5" /> New subject…
          </button>
        </PopoverContent>
      </Popover>
      <CreateSubjectDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(s) => {
          setSubjects((prev) => [...(prev ?? []), { ...s, topics: [] }]);
          void start(s._id);
        }}
      />
    </>
  );
}
