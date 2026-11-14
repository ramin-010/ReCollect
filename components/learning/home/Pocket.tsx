'use client';

import React, { useMemo, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { ChevronDown, Copy, Link2, Loader2, MoreHorizontal, Paperclip, Pencil, Pin, PinOff, Plus, Search, StickyNote, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { dayOf, formatClock } from '@/lib/learning/dates';
import { resolveTimeZone, type DayString } from '@/lib/learning/engine';
import { inlineText, looksLikeShell, parseNote } from '@/lib/learning/parseNote';
import type { Attachment, Capture, QuickNote, QuickNoteCategory } from '@/lib/learning/types';
import { RcButton, RcConfirm, RcIconButton, RcMenu, RcSegmented, RcSheet } from '@/components/rc-ui';
import { CopyButton, copyText, NoteBody, primaryCopyText } from './NoteBody';
import { SectionHead } from './parts';
import { relativeDay } from './format';

const LONG_NOTE_LINES = 9;

function noteWhen(note: QuickNote, today: DayString, tz: string): string {
  const day = dayOf(note.createdAt, tz);
  if (day === today) return `Today, ${formatClock(note.createdAt, tz).toLowerCase()}`;
  return relativeDay(day, today);
}

export function PocketNote({ note, today, tz }: { note: QuickNote; today: DayString; tz: string }) {
  const { saveQuickNote, toggleQuickNotePin, deleteQuickNote, openPreview } = useLearningStore.getState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lines = note.content.split('\n').length;
  const singleLine = note.content.trim() !== '' && !note.content.includes('\n');
  const isLong = lines > LONG_NOTE_LINES || note.content.length > 600;

  const save = async () => {
    setEditing(false);
    if (draft !== note.content && (draft.trim() || note.attachments.length)) {
      const ok = await saveQuickNote({ _id: note._id, content: draft, category: note.category, attachments: note.attachments });
      if (!ok) setDraft(note.content);
    } else {
      setDraft(note.content);
    }
  };

  return (
    <li className={cn('rc-row group px-3.5 py-3 border-t border-[var(--rc-line)]', note.isOptimistic && 'opacity-70')}>
      {editing ? (
        <div>
          <TextareaAutosize
            autoFocus
            className="rc-textarea"
            value={draft}
            minRows={2}
            maxRows={16}
            aria-label="Edit note"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void save();
              }
              if (e.key === 'Escape') {
                e.stopPropagation();
                setDraft(note.content);
                setEditing(false);
              }
            }}
          />
          <div className="mt-2 flex items-center gap-2">
            <RcButton size="sm" variant="main" onClick={() => void save()}>
              Save note
            </RcButton>
            <RcButton
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(note.content);
                setEditing(false);
              }}
            >
              Cancel
            </RcButton>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {note.content.trim() && (
              <div className={cn('relative', isLong && !expanded && 'max-h-[13.5em] overflow-hidden')}>
                {singleLine && looksLikeShell(note.content) ? (
                  <p className="rc-code break-words !text-[13.5px] text-[var(--rc-ink-1)]">{note.content}</p>
                ) : singleLine ? (
                  <NoteBody content={note.content} className="!text-[var(--rc-ink-1)]" />
                ) : (
                  <NoteBody content={note.content} />
                )}
              </div>
            )}
            {isLong && (
              <button type="button" className="rc-btn rc-btn--quiet rc-btn--sm -ml-2 mt-1" onClick={() => setExpanded((x) => !x)} aria-expanded={expanded}>
                {expanded ? 'Show less' : `Show all ${lines} lines`}
              </button>
            )}
            {note.attachments.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {note.attachments.map((a, i) => (
                  <button
                    key={`${a.url}-${i}`}
                    type="button"
                    onClick={() => openPreview({ url: a.url, title: a.fileName, fileType: a.fileType })}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-[6px] bg-[var(--rc-surface-2)] px-2 py-1 text-[13px] text-[var(--rc-ink-2)] hover:text-[var(--rc-ink-1)] cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{a.fileName}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="rc-meta mt-1.5 flex items-center gap-1.5">
              {note.isPinned && (
                <>
                  <Pin className="w-3.5 h-3.5" aria-hidden />
                  <span className="sr-only">Pinned.</span>
                </>
              )}
              <span>{noteWhen(note, today, tz)}</span>
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 -mr-1.5 -mt-1">
            {singleLine && <CopyButton text={note.content} label="Copy" />}
            <div className="rc-row-actions">
              <RcMenu
                label="Note actions"
                actions={[
                  {
                    label: 'Copy note',
                    icon: <Copy />,
                    onSelect: async () => {
                      if (await copyText(note.content)) toast.success('Copied');
                    },
                  },
                  { label: note.isPinned ? 'Unpin' : 'Pin to top', icon: note.isPinned ? <PinOff /> : <Pin />, onSelect: () => void toggleQuickNotePin(note._id) },
                  { label: 'Edit', icon: <Pencil />, onSelect: () => setEditing(true) },
                  { label: 'Delete', icon: <Trash2 />, danger: true, separatorBefore: true, onSelect: () => setConfirmDelete(true) },
                ]}
              >
                <RcIconButton label="Note actions" size="sm">
                  <MoreHorizontal />
                </RcIconButton>
              </RcMenu>
            </div>
          </div>
        </div>
      )}
      <RcConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this note?"
        body={<p className="break-words">“{note.content.split('\n')[0]?.slice(0, 80) || 'Attachment'}” will be gone for good.</p>}
        confirmLabel="Delete note"
        danger
        onConfirm={() => {
          setConfirmDelete(false);
          void deleteQuickNote(note._id);
        }}
      />
    </li>
  );
}

/** A note's label for copy-first rows: its first block as plain text (markdown stripped). */
export function noteLabel(content: string): string {
  const first = parseNote(content)[0];
  if (!first) return '';
  switch (first.type) {
    case 'heading':
    case 'label':
      return inlineText(first.children);
    case 'paragraph':
      return first.lines[0] ? inlineText(first.lines[0]) : '';
    case 'list':
      return first.items[0] ? inlineText(first.items[0].children) : '';
    case 'code':
      return first.code.split('\n')[0] ?? '';
  }
}

/** The quick-note composer: Enter saves, Shift+Enter breaks a line, files attach by click, paste or drop. */
export function NoteComposer({
  category,
  pin = false,
  autoFocus = false,
  placeholder,
  onDone,
}: {
  category: QuickNoteCategory;
  /** Pin the note once saved (the Home pocket shows pinned notes only). */
  pin?: boolean;
  autoFocus?: boolean;
  placeholder: string;
  onDone?: () => void;
}) {
  const [composerId, setComposerId] = useState(() => uuidv4());
  const [content, setContent] = useState('');
  const [drafts, setDrafts] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const upload = async (file: File) => {
    setUploading((n) => n + 1);
    try {
      const att = await learningApi.uploadLearningFile(file);
      setDrafts((prev) => [...prev, { ...att, fileName: att.fileName || file.name, fileType: att.fileType || file.type }]);
    } catch (e) {
      toast.error(e instanceof Error ? `Upload failed: ${e.message}` : 'Upload failed. Try again.');
    } finally {
      setUploading((n) => n - 1);
    }
  };

  const submit = async () => {
    if (!content.trim() && drafts.length === 0) return;
    const note = { _id: composerId, content, category, attachments: drafts.length ? drafts : undefined };
    setComposerId(uuidv4());
    setContent('');
    setDrafts([]);
    const store = useLearningStore.getState();
    const ok = await store.saveQuickNote(note);
    if (!ok) {
      setContent((cur) => cur || note.content);
      setDrafts((cur) => (cur.length ? cur : note.attachments ?? []));
      return;
    }
    if (pin) await store.toggleQuickNotePin(note._id);
    onDone?.();
  };

  const wrap = (before: string, after: string, ph: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: a, selectionEnd: b, value } = ta;
    const selected = value.slice(a, b) || ph;
    setContent(value.slice(0, a) + before + selected + after + value.slice(b));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(a + before.length, a + before.length + selected.length);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const run = { b: () => wrap('**', '**', 'bold'), i: () => wrap('*', '*', 'italic'), e: () => wrap('`', '`', 'code'), k: () => wrap('[', '](url)', 'label') }[e.key.toLowerCase()];
      if (run) {
        e.preventDefault();
        // Ctrl+K here inserts a link; keep the global palette from opening mid-note.
        e.stopPropagation();
        run();
        return;
      }
    }
    if (e.key === 'Escape' && onDone && !content.trim()) {
      e.stopPropagation();
      onDone();
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        Array.from(e.dataTransfer?.files ?? []).forEach((f) => void upload(f));
      }}
    >
      <TextareaAutosize
        ref={taRef}
        autoFocus={autoFocus}
        className="w-full resize-none bg-transparent text-[15px] leading-[1.45] text-[var(--rc-ink-1)] placeholder:text-[var(--rc-ink-3)] focus-visible:!outline-none"
        placeholder={placeholder}
        aria-label="New note"
        minRows={1}
        maxRows={12}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={(e) => {
          const file = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === 'file')?.getAsFile();
          if (file) {
            e.preventDefault();
            void upload(file);
          }
        }}
      />
      {drafts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {drafts.map((d, i) => (
            <span key={`${d.url}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-[6px] bg-[var(--rc-surface-2)] py-0.5 pl-2 pr-0.5 text-[13px] text-[var(--rc-ink-2)]">
              <Paperclip className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="truncate">{d.fileName}</span>
              <RcIconButton label={`Remove ${d.fileName}`} size="sm" className="!h-6 !w-6" onClick={() => setDrafts((prev) => prev.filter((_, idx) => idx !== i))}>
                <X />
              </RcIconButton>
            </span>
          ))}
        </div>
      )}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <RcIconButton label={uploading ? 'Uploading' : 'Attach a file'} size="sm" className="-ml-1.5" disabled={uploading > 0} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />}
        </RcIconButton>
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
        {content.trim() || drafts.length ? (
          <RcButton size="sm" variant="main" onClick={() => void submit()}>
            Save note
          </RcButton>
        ) : (
          <span className="rc-meta">Enter saves</span>
        )}
      </div>
    </div>
  );
}

/** One copy-first line: the note's label, one-click copy, and the full note (code too) when opened. */
function PocketLine({ note }: { note: QuickNote }) {
  const [open, setOpen] = useState(false);
  const label = noteLabel(note.content).trim() || note.attachments[0]?.fileName || 'Note';
  const copy = primaryCopyText(note.content);
  return (
    <li className="rc-row rc-hoverable">
      <div className="flex items-start gap-1 py-[3px] pl-0.5 pr-0.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((x) => !x)}
          className="flex min-w-0 flex-1 items-start gap-1.5 rounded-[6px] px-1.5 py-[5px] text-left cursor-pointer"
        >
          <ChevronDown aria-hidden className={cn('mt-[3px] w-4 h-4 shrink-0 text-[var(--rc-icon)] transition-transform', !open && '-rotate-90')} />
          <span className="min-w-0 break-words text-[14px] leading-[1.45] text-[var(--rc-ink-1)]">{label}</span>
        </button>
        {note.content.trim() && <CopyButton text={copy} label={`Copy “${label}”`} />}
      </div>
      {open && (
        <div className="pb-3 pl-[30px] pr-3">
          <NoteBody content={note.content} skipFirstIf={label} />
        </div>
      )}
    </li>
  );
}

/**
 * The rail's Pocket (LOOP_V2_SPEC §8): pinned notes only, copy first. Search looks through every
 * note; "Add" opens an inline composer (the note is pinned so it lands here); everything else
 * lives in All notes.
 */
export function PocketRail({ notes, onOpenAll }: { notes: QuickNote[]; onOpenAll: () => void }) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const q = query.trim().toLowerCase();
  const usable = notes.filter((n) => n.content.trim() !== '' || n.attachments.length > 0);
  const pinned = usable.filter((n) => n.isPinned).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const matches = q
    ? usable
        .filter((n) => n.content.toLowerCase().includes(q) || n.attachments.some((a) => a.fileName.toLowerCase().includes(q)))
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.createdAt.getTime() - a.createdAt.getTime())
    : [];
  const list = q ? matches.slice(0, 6) : pinned;

  return (
    <section aria-labelledby="pocket-h">
      <SectionHead id="pocket-h" title="Pocket">
        <RcButton variant="quiet" size="sm" icon={<Plus />} onClick={() => setAdding(true)} aria-expanded={adding}>
          Add
        </RcButton>
        <RcButton variant="quiet" size="sm" className="-mr-2" onClick={onOpenAll}>
          All notes
        </RcButton>
      </SectionHead>
      <div className="relative mb-2.5">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
        <input type="search" className="rc-input pl-8 pr-8" placeholder="Search all notes" aria-label="Search all notes" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && (
          <RcIconButton label="Clear search" size="sm" className="absolute right-0.5 top-1/2 -translate-y-1/2" onClick={() => setQuery('')}>
            <X />
          </RcIconButton>
        )}
      </div>
      <div className="-mx-1.5">
        {adding && (
          <div className="rc-card mx-1.5 mb-2 px-3.5 pt-3 pb-2.5">
            <NoteComposer category="PRIMARY" pin autoFocus placeholder="A command, a link or a note to keep at hand" onDone={() => setAdding(false)} />
          </div>
        )}
        {list.length > 0 ? (
          <ul aria-label={q ? 'Matching notes' : 'Pinned notes'} className="flex flex-col gap-px">
            {list.map((n) => (
              <PocketLine key={n._id} note={n} />
            ))}
          </ul>
        ) : (
          <p className="px-1.5 py-2 text-[14px] leading-[1.45] rc-ink-2">
            {q ? `No notes match “${query.trim()}”.` : 'Pin the notes you reach for every day, like an ssh command. They sit here, one click from the clipboard.'}
          </p>
        )}
        {q && matches.length > list.length && (
          <div className="px-0.5 py-1">
            <RcButton size="sm" variant="quiet" onClick={onOpenAll}>
              {matches.length - list.length} more in All notes
            </RcButton>
          </div>
        )}
      </div>
    </section>
  );
}

function InboxRow({ item }: { item: Capture }) {
  const title = item.title || item.content?.slice(0, 80) || item.url || 'Capture';
  const { openEditCapture, deleteCapture } = useLearningStore.getState();
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="rc-row flex items-start gap-3 border-t border-[var(--rc-line)] px-3.5 py-3">
      {item.type === 'LINK' ? <Link2 className="mt-[2px] w-[18px] h-[18px] shrink-0 rc-ink-3" aria-hidden /> : <StickyNote className="mt-[2px] w-[18px] h-[18px] shrink-0 rc-ink-3" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="break-words text-[15px] leading-[1.4] text-[var(--rc-ink-1)]">{title}</p>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block break-all text-[13.5px]">
            {item.url}
          </a>
        )}
        {item.category && <p className="rc-meta mt-0.5">{item.category.replace('#', '')}</p>}
      </div>
      <RcMenu
        label="Inbox item actions"
        actions={[
          { label: 'Edit', icon: <Pencil />, onSelect: () => openEditCapture({ captureId: item._id, title: item.title ?? '', content: item.content ?? '' }) },
          { label: 'Delete', icon: <Trash2 />, danger: true, separatorBefore: true, onSelect: () => setConfirm(true) },
        ]}
      >
        <RcIconButton label="Inbox item actions" size="sm" className="-mr-1.5 -mt-1">
          <MoreHorizontal />
        </RcIconButton>
      </RcMenu>
      <RcConfirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this capture?"
        body={<p className="break-words">“{title}” will be gone for good.</p>}
        confirmLabel="Delete capture"
        danger
        onConfirm={() => {
          setConfirm(false);
          void deleteCapture(item._id);
        }}
      />
    </li>
  );
}

type NotesTab = QuickNoteCategory | 'INBOX';

/**
 * All notes: the full pocket in a side sheet (Vault, Scratch and the capture Inbox), with search,
 * the composer and every note's actions. Home itself shows pinned notes only.
 */
export function AllNotesSheet({
  open,
  onOpenChange,
  notes,
  inbox,
  today,
  timezone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  notes: QuickNote[];
  inbox: { count: number; items: Capture[] };
  today: DayString;
  timezone: string;
}) {
  const tz = resolveTimeZone(timezone);
  const [tab, setTab] = useState<NotesTab>('PRIMARY');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const counts = useMemo(
    () => ({ PRIMARY: notes.filter((n) => n.category !== 'TEMPORARY').length, TEMPORARY: notes.filter((n) => n.category === 'TEMPORARY').length }),
    [notes],
  );
  const visible = useMemo(
    () =>
      tab === 'INBOX'
        ? []
        : notes
            .filter((n) => (tab === 'PRIMARY' ? n.category !== 'TEMPORARY' : n.category === 'TEMPORARY'))
            .filter((n) => n.content.trim() !== '' || n.attachments.length > 0)
            .filter((n) => !q || n.content.toLowerCase().includes(q) || n.attachments.some((a) => a.fileName.toLowerCase().includes(q)))
            .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.createdAt.getTime() - a.createdAt.getTime()),
    [notes, tab, q],
  );
  const inboxItems = inbox.items.filter((c) => !q || [c.title, c.content, c.url].some((x) => x?.toLowerCase().includes(q)));

  return (
    <RcSheet open={open} onOpenChange={onOpenChange} title="All notes">
      <div className="flex flex-col gap-2.5">
        <RcSegmented
          label="Which notes"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'PRIMARY', label: 'Vault', count: counts.PRIMARY },
            { value: 'TEMPORARY', label: 'Scratch', count: counts.TEMPORARY },
            { value: 'INBOX', label: 'Inbox', count: inbox.count },
          ]}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
          <input type="search" className="rc-input pl-8" placeholder={tab === 'INBOX' ? 'Search the inbox' : 'Search notes'} aria-label="Search notes" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="rc-card mt-3 overflow-hidden">
        {tab !== 'INBOX' && (
          <div className="px-3.5 pt-3 pb-2.5">
            <NoteComposer key={tab} category={tab} placeholder={tab === 'PRIMARY' ? 'Jot a note, a command or a link' : 'Jot something for now'} />
          </div>
        )}
        {tab === 'INBOX' ? (
          inboxItems.length ? (
            <ul className="-mt-px">
              {inboxItems.map((c) => (
                <InboxRow key={c._id} item={c} />
              ))}
            </ul>
          ) : (
            <p className="px-3.5 py-4 text-[15px] rc-ink-2">{q ? `Nothing in the inbox matches “${query.trim()}”.` : 'The inbox is empty. Notes saved with Ctrl K and no subject land here.'}</p>
          )
        ) : visible.length ? (
          <ul>
            {visible.map((n) => (
              <PocketNote key={n._id} note={n} today={today} tz={tz} />
            ))}
          </ul>
        ) : (
          <p className="border-t border-[var(--rc-line)] px-3.5 py-4 text-[15px] rc-ink-2">
            {q ? `No notes match “${query.trim()}”.` : tab === 'PRIMARY' ? 'No notes yet. Jot one above.' : 'Scratch is empty. Use it for things you only need for now.'}
          </p>
        )}
      </div>
    </RcSheet>
  );
}
