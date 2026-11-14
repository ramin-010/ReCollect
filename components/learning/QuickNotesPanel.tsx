'use client';

import React, { useMemo, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { Bold, Code, Code2, FileText, Italic, Link2, List, Loader2, Pin, PinOff, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { dayOf, relativeDayLabel } from '@/lib/learning/dates';
import { resolveTimeZone, type DayString } from '@/lib/learning/engine';
import { inlineText, parseNote } from '@/lib/learning/parseNote';
import type { Attachment, QuickNote, QuickNoteCategory } from '@/lib/learning/types';
import { NoteCodeStyles } from './NoteContent';
import { QuickNoteItem } from './QuickNoteItem';
import { lx } from './styles';

/**
 * The pinned shelf's one-line preview: the note's first block as plain text, markdown stripped by
 * the same parser the notes list renders with (Revise showed the raw first line, e.g. "**Title**: …").
 */
function pinnedPreview(content: string): string {
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

function DraftChip({ draft, onRemove, onRename }: { draft: Attachment; onRemove: () => void; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const dot = draft.fileName.lastIndexOf('.');
  const hasExt = dot > 0;
  const base = hasExt ? draft.fileName.slice(0, dot) : draft.fileName;
  const ext = hasExt ? draft.fileName.slice(dot) : '';
  const isImage = draft.fileType.startsWith('image/');
  const name = editing ? (
    <input
      autoFocus
      value={base}
      onChange={(e) => onRename(e.target.value + ext)}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          setEditing(false);
        }
      }}
      className={cn('text-[10px] bg-transparent outline-none truncate w-full', lx.fg90)}
      placeholder="Rename..."
    />
  ) : (
    <span onDoubleClick={() => setEditing(true)} className={cn('text-[10px] truncate w-full cursor-text', lx.muted)} title="Double click to rename">
      {base || 'Rename...'}
    </span>
  );
  return (
    <div className="relative group/draft w-fit">
      {isImage ? (
        <div className="flex flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.url} alt="Draft" className={cn('h-16 w-auto rounded-lg object-cover border', lx.border)} />
          <div className="flex items-center w-full max-w-[100px]">
            {name}
            {ext && <span className={cn('text-[10px] opacity-60', lx.muted)}>{ext}</span>}
          </div>
        </div>
      ) : (
        <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg max-w-[160px]', lx.card)}>
          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex items-center flex-1 min-w-0">
            {name}
            {ext && <span className={cn('text-[10px] opacity-60', lx.muted)}>{ext}</span>}
          </div>
        </div>
      )}
      <button
        onClick={onRemove}
        className={cn('absolute -top-2 -right-2 p-1 rounded-full border shadow-xl opacity-0 group-hover/draft:opacity-100 transition-colors bg-[hsl(var(--card))] hover:text-[hsl(var(--foreground))]', lx.border, lx.muted)}
        title="Remove attachment"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/**
 * Revise QuickNotesWidget: composer (search, attach, Vault/Scratch, markdown toolbar,
 * Enter to save), pinned shelf, notes grouped by day. Saves are optimistic client-UUID upserts.
 */
export function QuickNotesPanel({ notes, today, timezone }: { notes: QuickNote[]; today: DayString; timezone: string }) {
  const saveQuickNote = useLearningStore((s) => s.saveQuickNote);
  const toggleQuickNotePin = useLearningStore((s) => s.toggleQuickNotePin);

  const [composerId, setComposerId] = useState(() => uuidv4());
  const [content, setContent] = useState('');
  const [drafts, setDrafts] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<QuickNoteCategory>('PRIMARY');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tz = resolveTimeZone(timezone);

  const hasSendable = content.trim() !== '' || drafts.length > 0;
  const showToolbar = !isSearchOpen && (isFocused || hasSendable);

  // ── filtering / grouping ──
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...notes]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .filter((n) => (activeTab === 'PRIMARY' ? n.category !== 'TEMPORARY' : n.category === 'TEMPORARY'))
      .filter((n) => n.content.trim() !== '' || n.attachments.length > 0)
      .filter((n) => !q || n.content.toLowerCase().includes(q));
  }, [notes, activeTab, searchQuery]);

  const pinned = useMemo(() => filtered.filter((n) => n.isPinned), [filtered]);

  const groups = useMemo(() => {
    const out: { day: DayString; label: string; notes: QuickNote[] }[] = [];
    for (const n of filtered) {
      const day = dayOf(n.createdAt, tz);
      const last = out[out.length - 1];
      if (last && last.day === day) last.notes.push(n);
      else out.push({ day, label: relativeDayLabel(day, today), notes: [n] });
    }
    return out;
  }, [filtered, tz, today]);

  // ── composer helpers (markdown wrapping; the stored text is what was typed) ──
  const commit = (next: string, selStart: number, selEnd: number) => {
    setContent(next);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };
  const wrapSelection = (before: string, after: string, placeholder: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const selected = value.slice(s, e) || placeholder;
    commit(value.slice(0, s) + before + selected + after + value.slice(e), s + before.length, s + before.length + selected.length);
  };
  const wrapFence = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const selected = value.slice(s, e) || 'code';
    const before = (s > 0 && value[s - 1] !== '\n' ? '\n' : '') + '```\n';
    commit(value.slice(0, s) + before + selected + '\n```\n' + value.slice(e), s + before.length, s + before.length + selected.length);
  };
  const prefixLines = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const value = ta.value;
    const lineStart = value.lastIndexOf('\n', Math.max(0, ta.selectionStart - 1)) + 1;
    const rawEnd = value.indexOf('\n', ta.selectionEnd);
    const lineEnd = rawEnd === -1 ? value.length : rawEnd;
    const updated = value
      .slice(lineStart, lineEnd)
      .split('\n')
      .map((l) => (l.startsWith(prefix) ? l.slice(prefix.length) : prefix + l))
      .join('\n');
    commit(value.slice(0, lineStart) + updated + value.slice(lineEnd), lineStart, lineStart + updated.length);
  };

  const upload = async (file: File) => {
    setUploading((n) => n + 1);
    try {
      const att = await learningApi.uploadLearningFile(file);
      setDrafts((prev) => [...prev, { ...att, fileName: att.fileName || file.name, fileType: att.fileType || file.type }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading((n) => n - 1);
    }
  };

  const submit = async () => {
    if (isSearchOpen || !hasSendable) return;
    const note = { _id: composerId, content, category: activeTab, attachments: drafts.length ? drafts : undefined };
    // Reset the composer straight away: the note is already in the list (optimistic).
    setComposerId(uuidv4());
    setContent('');
    setDrafts([]);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const ok = await saveQuickNote(note);
    if (!ok) {
      // Give the text back so nothing typed is lost.
      setContent((cur) => (cur ? cur : note.content));
      setDrafts((cur) => (cur.length ? cur : drafts));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !isSearchOpen) {
      const key = e.key.toLowerCase();
      const run = { b: () => wrapSelection('**', '**', 'bold'), i: () => wrapSelection('*', '*', 'italic'), e: () => wrapSelection('`', '`', 'code'), k: () => wrapSelection('[', '](url)', 'label') }[key];
      if (run) {
        e.preventDefault();
        // Ctrl+K here is "insert link" (Revise); keep the global palette from opening mid-note.
        e.stopPropagation();
        run();
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isSearchOpen) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void upload(file);
          return;
        }
      }
    }
  };

  const tabs = (
    <div className="flex items-center gap-4 transform scale-[0.8] origin-right">
      {(['PRIMARY', 'TEMPORARY'] as const).map((cat, i) => (
        <React.Fragment key={cat}>
          {i === 1 && <div className={cn('w-px h-3', lx.divider)} />}
          <button
            onClick={() => setActiveTab(cat)}
            className={cn('text-[10px] font-bold uppercase tracking-wider transition-colors outline-none hover:text-[hsl(var(--foreground))]', activeTab === cat ? lx.fg : lx.muted)}
          >
            {cat === 'PRIMARY' ? 'Vault' : 'Scratch'}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  const TOOLBAR = [
    { icon: Bold, title: 'Bold (Ctrl+B)', run: () => wrapSelection('**', '**', 'bold') },
    { icon: Italic, title: 'Italic (Ctrl+I)', run: () => wrapSelection('*', '*', 'italic') },
    { icon: Code, title: 'Inline code (Ctrl+E)', run: () => wrapSelection('`', '`', 'code') },
    { icon: Code2, title: 'Code block', run: wrapFence },
    { icon: Link2, title: 'Link (Ctrl+K)', run: () => wrapSelection('[', '](url)', 'label') },
    { icon: List, title: 'Bullet list', run: () => prefixLines('- ') },
  ];

  return (
    <div className="flex flex-col w-full h-[calc(100vh-7rem)] pb-4">
      <NoteCodeStyles />
      {/* ── Composer ── */}
      <div className="shrink-0 z-10 pt-1">
        <div className="w-full mb-4 relative">
          <div
            className={cn(
              'flex items-start gap-3 w-full pb-2 transition-all border-b-2',
              isDragging ? 'border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/5 p-4 rounded-t-xl' : 'border-[var(--border-subtle)] focus-within:border-[hsl(var(--primary))]/40',
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              Array.from(e.dataTransfer?.files ?? []).forEach((f) => void upload(f));
            }}
          >
            <div className="flex items-center gap-1.5 mt-[2px]">
              <button
                onClick={() => {
                  setIsSearchOpen((o) => !o);
                  if (isSearchOpen) setSearchQuery('');
                }}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  isSearchOpen ? 'bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/30' : cn('text-[hsl(var(--foreground))]/50 hover:text-[hsl(var(--foreground))]/80', lx.hover),
                )}
                title={isSearchOpen ? 'Exit search' : 'Search notes'}
              >
                <Search className="w-4 h-4" />
              </button>
              {!isSearchOpen && (
                <button
                  onClick={() => uploading === 0 && fileInputRef.current?.click()}
                  disabled={uploading > 0}
                  className={cn('p-1.5 rounded-md transition-colors', uploading > 0 ? 'text-[hsl(var(--primary))] cursor-not-allowed' : cn('text-[hsl(var(--foreground))]/50 hover:text-[hsl(var(--foreground))]/80', lx.hover))}
                  title="Attach file"
                >
                  {uploading > 0 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                Array.from(e.target.files ?? []).forEach((f) => void upload(f));
                e.target.value = '';
              }}
            />
            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center relative">
              <div className="w-full flex justify-end md:hidden pr-2 mb-1">{tabs}</div>
              <div className="w-full relative">
                {drafts.length > 0 && !isSearchOpen && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {drafts.map((d, idx) => (
                      <DraftChip
                        key={`${d.url}-${idx}`}
                        draft={d}
                        onRemove={() => setDrafts((prev) => prev.filter((_, i) => i !== idx))}
                        onRename={(name) => setDrafts((prev) => prev.map((a, i) => (i === idx ? { ...a, fileName: name } : a)))}
                      />
                    ))}
                  </div>
                )}
                <TextareaAutosize
                  ref={textareaRef}
                  value={isSearchOpen ? searchQuery : content}
                  onChange={(e) => (isSearchOpen ? setSearchQuery(e.target.value) : setContent(e.target.value))}
                  onKeyDown={onKeyDown}
                  onPaste={onPaste}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  minRows={1}
                  maxRows={14}
                  placeholder={isSearchOpen ? 'Search notes...' : isDragging ? 'Drop file here...' : 'Jot something down...'}
                  className="w-full bg-transparent resize-none outline-none text-[15px] leading-relaxed text-[hsl(var(--foreground))]/90 placeholder:text-[hsl(var(--foreground))]/50 custom-scrollbar mt-1.5 pb-1"
                />
                {showToolbar && (
                  <div className="flex items-center justify-between gap-2 pb-1 pt-0.5">
                    <div className="flex items-center gap-0.5 min-w-0">
                      {TOOLBAR.map(({ icon: Icon, title, run }) => (
                        <button
                          key={title}
                          type="button"
                          title={title}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={run}
                          className={cn('p-1.5 rounded-md text-[hsl(var(--foreground))]/35 hover:text-[hsl(var(--foreground))]/80 transition-colors shrink-0', lx.hover)}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                    {hasSendable && (
                      <button
                        onClick={() => void submit()}
                        title="Send · Enter to save, Shift+Enter for a new line"
                        className={cn('flex items-center justify-center p-1.5 rounded-full transition-colors shadow-sm shrink-0', lx.primaryBg)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 translate-x-[1px]">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              {isSearchOpen && searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-0 top-2 p-1 text-[hsl(var(--foreground))]/30 hover:text-[hsl(var(--foreground))]/60 rounded-full" aria-label="Clear search">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="hidden md:flex ml-2 shrink-0 self-start mt-[4px] flex-col items-end gap-2">{tabs}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feed ── */}
      <div ref={scrollRef} className={cn('flex-1 overflow-y-auto custom-scrollbar relative scroll-smooth pr-2', activeTab === 'TEMPORARY' ? 'pt-4' : 'pt-0')}>
        {pinned.length > 0 && (
          <div className="shrink-0 mb-4 flex flex-col gap-1">
            {pinned.map((note) => {
              const firstLine = pinnedPreview(note.content).trim();
              return (
                <div
                  key={`pinned-${note._id}`}
                  className={cn('group/pin flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all cursor-pointer bg-[hsl(var(--card))] hover:border-[hsl(var(--foreground))]/20', lx.border)}
                  onClick={() => document.getElementById(`note-${note._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                >
                  <Pin className="w-2.5 h-2.5 text-[hsl(var(--foreground))]/40 shrink-0" />
                  <span className="text-[12px] text-[hsl(var(--foreground))]/70 truncate flex-1">
                    {firstLine.substring(0, 60) || 'Attachment'}
                    {firstLine.length > 60 ? '...' : ''}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleQuickNotePin(note._id);
                    }}
                    className={cn('p-1 rounded text-[hsl(var(--foreground))]/30 hover:text-[hsl(var(--foreground))]/60 opacity-0 group-hover/pin:opacity-100 transition-all shrink-0', lx.hover)}
                    title="Unpin"
                  >
                    <PinOff className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {groups.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-12 text-[hsl(var(--foreground))]/30">
            <Search className="w-6 h-6 mb-2" />
            <span className="text-[13px]">No notes match your search</span>
          </div>
        )}

        {groups.map((g) => (
          <div key={g.day} className="mb-6">
            {g.day !== today && (
              <div className="flex items-center gap-4 mb-8">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-[hsl(var(--foreground))]/30">{g.label}</span>
                <div className={cn('h-px w-12', lx.divider)} />
              </div>
            )}
            <div className="flex flex-col items-start w-full">
              {g.notes.map((note) => (
                <div key={note._id} id={`note-${note._id}`} className="w-full">
                  <QuickNoteItem note={note} timezone={tz} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
