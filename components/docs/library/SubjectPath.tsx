'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ArrowDown, ArrowUp, CircleCheck, CircleDashed, CircleSlash, Copy, FilePlus2, FileText, GripVertical, MoreHorizontal, Plus, Target, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { learningApi } from '@/lib/api/learningApi';
import { cn } from '@/lib/utils';
import type { PathStatus, PathTopic, SubjectPath, TopicPathPatch, TopicStatus } from '@/lib/learning/types';
import { RcButton, RcConfirm, RcIconButton, RcMenu, RcSkel, rcScope, type MenuAction } from '@/components/rc-ui';
import { PATH_STATUS_WORD, PathMark, studyPrompt } from '@/components/learning/PathMark';
import { StatusCell } from './StatusCell';

const STATUS_ACTIONS: { status: PathStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'in_progress', label: 'Start it', icon: <PathMark status="in_progress" className="h-4 w-4" /> },
  { status: 'done', label: 'Mark done', icon: <CircleCheck className="h-4 w-4" /> },
  { status: 'planned', label: 'Back to planned', icon: <CircleDashed className="h-4 w-4" /> },
  { status: 'skipped', label: 'Skip it', icon: <CircleSlash className="h-4 w-4" /> },
];

/** Positions 1..n again after a local move. */
const renumbered = (topics: PathTopic[]): PathTopic[] => topics.map((t, i) => ({ ...t, position: i + 1 }));

/**
 * A subject's path (SYNC_SPINE_SPEC 1.1): its topics in course order, done ticks, the current one,
 * what is ahead. Drag a row by its grip (or use Move up / down) to reorder; a row's menu changes
 * its status; "Add a topic" plans one at the end. Every change is saved at once and shown as saved.
 */
export function SubjectPathView({ subjectId, subjectName, statuses }: { subjectId: string; subjectName: string; statuses: TopicStatus[] | null }) {
  const router = useRouter();
  const [path, setPath] = useState<SubjectPath | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [drag, setDrag] = useState<{ id: string; slot: number } | null>(null);
  const [removing, setRemoving] = useState<PathTopic | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  // The library keys this view by subject, so a new subject starts with fresh state.
  const [reloads, setReloads] = useState(0);
  useEffect(() => {
    let alive = true;
    learningApi.getPath(subjectId).then(
      (p) => alive && setPath(p),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [subjectId, reloads]);
  const retry = () => {
    setFailed(false);
    setReloads((n) => n + 1);
  };

  const statusByTopic = useMemo(() => new Map((statuses ?? []).map((s) => [s.topicId, s])), [statuses]);

  const save = async (topic: PathTopic, patch: TopicPathPatch, optimistic?: SubjectPath) => {
    const before = path;
    if (optimistic) setPath(optimistic);
    try {
      setPath((await learningApi.updateTopicPath(topic._id, patch)).path);
    } catch {
      setPath(before);
      toast.error('That did not save. Try again.');
    }
  };

  /** "Remove from path": the topic goes (its revisions with it); its note stays in Docs. */
  const removeTopic = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await learningApi.deleteTopic(removing._id);
      toast.success('Removed from the path');
      setRemoving(null);
      setReloads((r) => r + 1);
    } catch {
      toast.error('That did not save. Try again.');
    } finally {
      setRemoveBusy(false);
    }
  };

  /** Put `topic` at index `to` of the list without it. */
  const moveTo = (topic: PathTopic, to: number) => {
    if (!path) return;
    const rest = path.topics.filter((t) => t._id !== topic._id);
    const after = to === 0 ? null : rest[to - 1]!._id;
    const topics = [...rest];
    topics.splice(to, 0, topic);
    void save(topic, { after }, { ...path, topics: renumbered(topics) });
  };

  const startDrag = (e: React.PointerEvent, topic: PathTopic) => {
    if (!path || e.button !== 0) return;
    e.preventDefault();
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-topic]') ?? [])];
    const from = path.topics.findIndex((t) => t._id === topic._id);
    // The gap the pointer is nearest: 0 = before the first row, n = after the last.
    const slotAt = (y: number) => {
      const i = rows.findIndex((row) => {
        const r = row.getBoundingClientRect();
        return y < r.top + r.height / 2;
      });
      return i === -1 ? rows.length : i;
    };
    setDrag({ id: topic._id, slot: from });
    document.body.classList.add('path-grabbing');
    const move = (ev: PointerEvent) => setDrag({ id: topic._id, slot: slotAt(ev.clientY) });
    const end = (ev: PointerEvent | null) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', esc);
      document.body.classList.remove('path-grabbing');
      setDrag(null);
      if (!ev) return;
      const slot = slotAt(ev.clientY);
      const to = slot > from ? slot - 1 : slot;
      if (to !== from) moveTo(topic, to);
    };
    const up = (ev: PointerEvent) => end(ev);
    const esc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') end(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', esc);
  };

  // Adds run one after another, so a quick second title never races the first (and the newest
  // answer is always the last one shown). The input clears at once: the next title can be typed.
  const addQueue = useRef<Promise<void>>(Promise.resolve());
  const addTopic = () => {
    const title = draft.replace(/\s+/g, ' ').trim();
    if (!title || !path) return;
    setDraft('');
    addQueue.current = addQueue.current.then(async () => {
      try {
        setPath((await learningApi.planTopics(subjectId, [title])).path);
      } catch {
        setDraft((d) => d || title);
        toast.error(`“${title}” was not added. Try again.`);
      }
    });
  };

  const copyPrompt = async (topic: PathTopic) => {
    try {
      await navigator.clipboard.writeText(studyPrompt(subjectName, topic, topic.nextStep));
      toast.success('Prompt copied', { description: 'Paste it into a study chat to continue this topic.' });
    } catch {
      toast.error('Could not copy the prompt');
    }
  };

  const writeNote = async (topic: PathTopic) => {
    try {
      const { docId } = await learningApi.ensureTopicDoc(topic._id);
      router.push(`/docs/${encodeURIComponent(docId)}`);
    } catch {
      toast.error('The note could not be made. Try again.');
    }
  };

  if (failed) {
    return (
      <div className="lib-empty">
        <p className="rc-title">The path could not load</p>
        <p className="rc-body rc-ink-2 mt-1">Check that you are online, then try again.</p>
        <RcButton className="mt-4" variant="outline" onClick={retry}>
          Try again
        </RcButton>
      </div>
    );
  }

  if (!path) {
    return (
      <div aria-busy aria-label="Loading the path">
        <RcSkel className="mb-3 h-4 w-56" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="lib-row--skel">
            <RcSkel className="h-[18px] w-[18px]" />
            <RcSkel className="h-4" style={{ width: `${34 + ((i * 13) % 36)}%` }} />
          </div>
        ))}
      </div>
    );
  }

  const n = path.topics.length;
  const fromIndex = drag ? path.topics.findIndex((t) => t._id === drag.id) : -1;
  // No line where dropping changes nothing (right above or below the dragged row).
  const dropSlot = drag && drag.slot !== fromIndex && drag.slot !== fromIndex + 1 ? drag.slot : null;

  return (
    <div className="path">
      <p className="path-summary">
        {n === 0
          ? 'No topics on this path yet.'
          : `${path.done} of ${n} ${n === 1 ? 'topic' : 'topics'} done${path.next ? ` · next: ${path.next.position}. ${path.next.title}` : ' · nothing planned next'}`}
      </p>

      {n > 0 && (
        <ol ref={listRef} className="path-list" data-dragging={drag ? '' : undefined} aria-label={`${subjectName} path`}>
          {path.topics.map((t, i) => {
            const actions: MenuAction[] = [
              ...STATUS_ACTIONS.filter((a) => a.status !== t.status).map((a) => ({
                label: a.label,
                icon: a.icon,
                onSelect: () => void save(t, { status: a.status }, { ...path, topics: path.topics.map((x) => (x._id === t._id ? { ...x, status: a.status } : x)) }),
              })),
              ...(t.status === 'planned' || t.status === 'in_progress'
                ? [{ label: 'Copy study prompt', icon: <Copy className="h-4 w-4" />, onSelect: () => void copyPrompt(t), separatorBefore: true }]
                : []),
              t.docId
                ? { label: 'Open the note', icon: <FileText className="h-4 w-4" />, onSelect: () => router.push(`/docs/${encodeURIComponent(t.docId!)}`), separatorBefore: !(t.status === 'planned' || t.status === 'in_progress') }
                : { label: 'Write the note', icon: <FilePlus2 className="h-4 w-4" />, onSelect: () => void writeNote(t) },
              ...(i > 0 ? [{ label: 'Move up', icon: <ArrowUp className="h-4 w-4" />, onSelect: () => moveTo(t, i - 1), separatorBefore: true }] : []),
              ...(i < n - 1 ? [{ label: 'Move down', icon: <ArrowDown className="h-4 w-4" />, onSelect: () => moveTo(t, i + 1), separatorBefore: i === 0 }] : []),
              { label: 'Remove from path', icon: <Trash2 className="h-4 w-4" />, onSelect: () => setRemoving(t), danger: true, separatorBefore: true },
            ];
            return (
              <li
                key={t._id}
                data-topic
                className="lib-row rc-row path-row"
                data-status={t.status}
                data-dragging={drag?.id === t._id ? '' : undefined}
                data-drop={dropSlot === i ? 'before' : dropSlot === n && i === n - 1 ? 'after' : undefined}
              >
                <div className="path-row-grid">
                  <button
                    type="button"
                    className="path-grip"
                    aria-label={`Drag to move “${t.title}” (or use its menu: Move up, Move down)`}
                    title="Drag to move"
                    onPointerDown={(e) => startDrag(e, t)}
                  >
                    <GripVertical className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                  <span className="path-pos" aria-hidden>
                    {t.position}
                  </span>
                  <PathMark status={t.status} />
                  <div className="path-main">
                    {t.docId ? (
                      <Link href={`/docs/${encodeURIComponent(t.docId)}`} className="path-title">
                        {t.title}
                      </Link>
                    ) : (
                      <span className="path-title">{t.title}</span>
                    )}
                    {t.nextStep && t.status !== 'done' && t.status !== 'skipped' && <p className="path-step">Next step: {t.nextStep}</p>}
                    {!!t.weakSpots?.length && <WeakSpots title={t.title} spots={t.weakSpots} />}
                  </div>
                  <span className="path-state">
                    {t.status === 'done' && t.docId ? <StatusCell status={statusByTopic.get(t._id) ?? null} /> : <span className="lib-status">{PATH_STATUS_WORD[t.status]}</span>}
                  </span>
                </div>
                <span className="rc-row-actions lib-row-actions">
                  <RcMenu label={`Options for ${t.title}`} actions={actions}>
                    <RcIconButton label={`Options for ${t.title}`} size="sm">
                      <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                    </RcIconButton>
                  </RcMenu>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {adding ? (
        <form
          className="path-add"
          onSubmit={(e) => {
            e.preventDefault();
            addTopic();
          }}
        >
          <Plus className="h-4 w-4 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
          <input
            autoFocus
            className="path-add-input"
            value={draft}
            maxLength={200}
            placeholder="Topic title, then Enter"
            aria-label="New topic title"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (!draft.trim()) setAdding(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setDraft('');
                setAdding(false);
              }
            }}
          />
        </form>
      ) : (
        <button type="button" className="path-add path-add-btn" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Add a topic
        </button>
      )}
      {n === 0 && !adding && <p className="path-hint">Plan the course here one topic at a time, or ask a study chat to plan it: it can add every topic in one go.</p>}
      <RcConfirm
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove “${removing?.title ?? ''}” from the path?`}
        body={removing?.docId ? 'Its revisions end with it. Its note stays in Docs.' : 'Nothing else goes with it.'}
        confirmLabel="Remove from path"
        danger
        busy={removeBusy}
        onConfirm={() => void removeTopic()}
      />
    </div>
  );
}

/**
 * A topic's open weak spots (SYNC_SPINE_SPEC 1.2): what study chats and past reviews found shaky.
 * Recall asks about them first; a right answer clears one. A quiet count that opens the list.
 */
function WeakSpots({ title, spots }: { title: string; spots: { _id: string; text: string }[] }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="path-weak" aria-label={`${spots.length} weak ${spots.length === 1 ? 'spot' : 'spots'} in “${title}”`}>
          <Target className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {spots.length} weak {spots.length === 1 ? 'spot' : 'spots'}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} className={cn(rcScope, 'rc-float path-weak-pop')}>
          <p className="path-weak-head">Weak spots · Recall asks about these first</p>
          <ul>
            {spots.map((w) => (
              <li key={w._id}>{w.text}</li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
