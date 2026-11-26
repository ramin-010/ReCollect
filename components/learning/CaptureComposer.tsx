'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { CalendarClock, FileText, Loader2, Paperclip, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { todoApi } from '@/lib/api/todoApi';
import { parseTaskInput } from '@/lib/utils/smartDateParser';
import { getHighlightedContent } from '@/components/todo/task_Input/utils';
import { DEFAULT_TIMEZONE } from '@/lib/learning/engine';
import { formatDayChip, revisionDaysFrom, todayIn } from '@/lib/learning/dates';
import { useLearningStore } from '@/lib/store/learningStore';
import type { Attachment } from '@/lib/learning/types';
import { notesChanged } from '@/lib/learning/notesEvents';
import { isImageAttachment } from './AttachmentThumbnails';

export interface CaptureComposerHandle {
  focus: () => void;
}

interface CaptureComposerProps {
  mode: 'note' | 'link';
  revise: boolean;
  subjectId: string | null;
  topicId: string | null;
  /** DOC_PAGES_PLAN D4: the doc page it was opened on (the server keeps it when that page is revised with this lesson). */
  pageDocId?: string | null;
  isPinned: boolean;
  attachments: Attachment[];
  isUploading: boolean;
  onRemoveAttachment: (index: number) => void;
  onPasteFile: (file: File) => void;
  onSaved: () => void;
}

const BARE_URL = /^(https?:\/\/|www\.)\S+$/i;
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Ctrl+K Note / Link mode (Revise GlobalQuickNoteModal): title with date + #category
 * highlighting, details, #category suggestions, files.
 *   - ↻ off + a typed date ("tomorrow") → a TASK due that day (POST /api/todos). This fixes
 *     Revise silently dropping the date.
 *   - otherwise → POST /api/captures (NOTE, or LINK for a bare URL / Link mode), with
 *     `revise: true` when ↻ is on (server starts +1/+3/+7/+21 in the same transaction).
 */
export const CaptureComposer = forwardRef<CaptureComposerHandle, CaptureComposerProps>(function CaptureComposer(
  { mode, revise, subjectId, topicId, pageDocId, isPinned, attachments, isUploading, onRemoveAttachment, onPasteFile, onSaved },
  ref,
) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [tagIndex, setTagIndex] = useState(0);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => titleRef.current?.focus() }), []);

  useEffect(() => {
    let cancelled = false;
    learningApi
      .getCaptureCategories()
      .then((c) => !cancelled && setCategories(c))
      .catch(() => {
        /* suggestions are optional */
      });
    const t = setTimeout(() => titleRef.current?.focus(), 60);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const tz = useLearningStore((s) => s.data?.timezone) ?? DEFAULT_TIMEZONE;
  const parsed = useMemo(() => parseTaskInput(title), [title]);
  const typedDate = parsed.dueDate;
  const becomesTask = !revise && !!typedDate;

  // #category suggestions for the token being typed at the end of the title.
  const tagQuery = /#(\w*)$/.exec(title)?.[1];
  const suggestions = useMemo(() => {
    if (tagQuery === undefined) return [];
    const q = tagQuery.toLowerCase();
    const matches = categories.filter((c) => c.toLowerCase().startsWith(q) && c.toLowerCase() !== q);
    return q && !categories.some((c) => c.toLowerCase() === q) ? [...matches, `${tagQuery}`] : matches;
  }, [tagQuery, categories]);
  const showTags = suggestions.length > 0;

  const applyTag = (name: string) => {
    setTitle((t) => t.replace(/#(\w*)$/, `#${name} `));
    setTagIndex(0);
    setTimeout(() => titleRef.current?.focus(), 0);
  };

  const save = async () => {
    if (isSaving) return;
    const source = becomesTask ? parsed.cleanText : title;
    const tags = source.match(/#\w+/g) ?? [];
    const category = tags[0]?.slice(1);
    const cleanTitle = source.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanTitle && !content.trim() && attachments.length === 0) return;

    setIsSaving(true);
    try {
      if (becomesTask && typedDate) {
        const res = await todoApi.createTodo({
          title: cleanTitle || content.trim().slice(0, 80) || 'Untitled',
          description: content.trim() ? `<p>${escapeHtml(content.trim()).replace(/\n/g, '<br>')}</p>` : undefined,
          dueDate: typedDate.toISOString(),
          tags: category ? [category] : undefined,
          status: 'pending',
        });
        if (!res.success) throw new Error(res.message || 'Failed to create task');
        toast.success(`Task due ${formatDayChip(localDay(typedDate))}`);
      } else {
        const isUrl = BARE_URL.test(cleanTitle);
        const asLink = mode === 'link' || isUrl;
        await learningApi.createCapture({
          type: asLink ? 'LINK' : 'NOTE',
          title: isUrl ? undefined : cleanTitle || undefined,
          url: isUrl ? cleanTitle : undefined,
          content: content.trim() || undefined,
          category,
          subjectId: subjectId ?? undefined,
          topicId: topicId ?? undefined,
          ...(topicId && pageDocId ? { docId: pageDocId } : {}),
          isPinned,
          attachments: attachments.length ? attachments : undefined,
          revise,
        });
        const what = asLink ? 'Link' : 'Note';
        if (revise) toast.success('Saved · revisions scheduled', { description: 'It comes up in your list on its first review day.' });
        // STUDY_FLOW_PLAN §4.3: one on a lesson shows in its doc's notes panel; one on a subject on the subject's page.
        else if (topicId) toast.success(`${what} saved on this lesson`, { description: 'It is in the doc’s notes, at the top right.' });
        else if (subjectId) toast.success(`${what} saved on the subject`, { description: 'Its notes are on the subject’s page in Docs.' });
        else toast.success(`${what} saved to the inbox`, { description: 'Find it on Home under All notes › Inbox.' });
        notesChanged();
      }
      const store = useLearningStore.getState();
      if (store.isHomeMounted) void store.refresh();
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const overlay = getHighlightedContent(
    title,
    revise ? { ...parsed, matchedSegments: [] } : parsed,
    null,
    [],
    'absolute top-0 left-0 right-0 font-medium pointer-events-none whitespace-pre-wrap break-words leading-normal text-[15px]',
  );

  const revisionDays = revise ? revisionDaysFrom(todayIn(tz)) : [];

  return (
    <div className="relative bg-[hsl(var(--popover))] rounded-xl shadow-[0_0_0_1px_var(--border-subtle),0_10px_30px_-5px_rgba(0,0,0,0.3)]">
      <div className="px-4 pt-3 pb-2 flex flex-col gap-3">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a, i) =>
              isImageAttachment(a) ? (
                <div key={`${a.url}-${i}`} className="relative w-14 h-14 rounded-md group/img shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.fileName} className="w-full h-full object-cover rounded-md border border-[color:var(--border-subtle)]" />
                  <button onClick={() => onRemoveAttachment(i)} className="absolute -top-1.5 -right-1.5 p-0.5 bg-[hsl(var(--popover))] border border-[color:var(--border-subtle)] rounded-full text-[var(--ui-ink-2)] hover:text-red-400 opacity-0 group-hover/img:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div key={`${a.url}-${i}`} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--ui-hover)] border border-[color:var(--border-subtle)] text-[var(--ui-ink-2)] text-[11px]">
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{a.fileName}</span>
                  <button onClick={() => onRemoveAttachment(i)} className="ml-1 text-[var(--ui-ink-3)] hover:text-red-400" aria-label="Remove file">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ),
            )}
            {isUploading && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--ui-ink-3)]">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
              </div>
            )}
          </div>
        )}

        <div className="relative">
          {overlay}
          <style>{`.capture-title-input::selection { background-color: rgba(35,131,226,0.28) !important; }`}</style>
          <TextareaAutosize
            ref={titleRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTagIndex(0);
            }}
            onPaste={(e) => {
              const file = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === 'file')?.getAsFile();
              if (file) {
                e.preventDefault();
                onPasteFile(file);
              }
            }}
            onKeyDown={(e) => {
              if (showTags && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                e.preventDefault();
                setTagIndex((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length);
                return;
              }
              if (showTags && (e.key === 'Enter' || e.key === 'Tab')) {
                e.preventDefault();
                applyTag(suggestions[tagIndex] ?? suggestions[0]!);
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void save();
              }
            }}
            disabled={isSaving}
            minRows={1}
            maxRows={5}
            placeholder={mode === 'link' ? 'Paste a link, or name the resource… #category' : "Save a note, or type a date like 'tomorrow'… #category"}
            className={cn(
              'capture-title-input w-full bg-transparent placeholder:text-[var(--ui-ink-3)] focus:outline-none font-medium relative resize-none overflow-hidden block p-0 m-0 border-none leading-normal text-[15px]',
              overlay ? 'text-transparent caret-[var(--ui-ink-1)]' : 'text-[var(--ui-ink-1)]',
            )}
          />
          {showTags && (
            <div className="absolute left-0 top-full mt-1 z-[120] min-w-[180px] bg-[hsl(var(--popover))] border border-[color:var(--border-subtle)] rounded-lg shadow-xl p-1">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyTag(s);
                  }}
                  className={cn('w-full text-left px-2 py-1 rounded text-[12px]', i === tagIndex ? 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]' : 'text-[var(--ui-ink-2)] hover:bg-[var(--ui-hover)]')}
                >
                  {categories.includes(s) ? `#${s}` : `Create #${s}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <TextareaAutosize
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void save();
            }
          }}
          disabled={isSaving}
          minRows={1}
          maxRows={10}
          placeholder="Add more details (optional)..."
          className="w-full bg-transparent text-[14px] text-[var(--ui-ink-1)] placeholder:text-[var(--ui-ink-3)] focus:outline-none resize-none border-none m-0 p-0 leading-relaxed custom-scrollbar"
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {becomesTask && typedDate && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-semibold rounded-md border border-indigo-500/20">
              <CalendarClock className="w-3.5 h-3.5" />→ task due {formatDayChip(localDay(typedDate))}
              <button onClick={() => setTitle(parsed.cleanText)} className="ml-0.5 p-0.5 hover:bg-indigo-500/20 rounded-sm" title="Keep it a note (remove the date)">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {revise && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-300 text-xs font-medium rounded-md border border-emerald-500/20" title="Spaced repetition: +1, +3, +7 and +21 days">
              <RefreshCw className="w-3.5 h-3.5" />
              Revise on {revisionDays.map((d) => formatDayChip(d)).join(' · ')}
            </span>
          )}
          {revise && typedDate && <span className="text-[11px] text-amber-300/80">The typed date is ignored for revisions.</span>}
          {attachments.length === 0 && isUploading && (
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--ui-ink-3)]">
              <Paperclip className="w-3 h-3" /> Uploading…
            </span>
          )}
        </div>
        <button
          onClick={() => void save()}
          disabled={isSaving || isUploading || (!title.trim() && !content.trim() && attachments.length === 0)}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--ui-ink-1)] text-[hsl(var(--background))] hover:bg-[var(--ui-ink-2)] transition-colors disabled:opacity-30 shadow-sm ml-auto"
          title="Save (Enter)"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
});
