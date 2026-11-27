'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, CornerDownLeft, ExternalLink, FileText, Link2, Pin, Search, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { docApi, type DocSearchHit } from '@/lib/api/docApi';
import { useLearningStore } from '@/lib/store/learningStore';
import type { Capture, QuickNote } from '@/lib/learning/types';
import { copyText, primaryCopyText } from './home/NoteBody';
import { noteLabel } from './home/Pocket';

const MAX_RESULTS = 8;
const MAX_CAPTURES = 5;
/** DOC_PAGES_PLAN §4.1 N6: docs (and the pages inside them, with their path) after the notes. */
const MAX_DOCS = 5;
/** Notes and links saved with Ctrl K, and docs, are searched on the server from this many characters. */
const CAPTURE_MIN_CHARS = 2;

type Result = { kind: 'note'; note: QuickNote } | { kind: 'capture'; capture: Capture } | { kind: 'doc'; doc: DocSearchHit };

/** The last doc search still fits the words typed since (it narrows while the next one runs). */
const docHas = (d: DocSearchHit, terms: string[]) => terms.every((t) => `${d.title} ${d.snippet}`.toLowerCase().includes(t));

function secondLine(note: QuickNote): string {
  const copy = primaryCopyText(note.content);
  const label = noteLabel(note.content).trim();
  const first = copy.split('\n').find((l) => l.trim() && l.trim() !== label);
  return first?.trim() ?? '';
}

/** A saved note or link by its title, else its text's first line, else its address. */
function captureTitle(c: Capture): string {
  const firstLine = c.content?.split('\n').find((l) => l.trim())?.trim();
  return c.title?.trim() || firstLine || c.url || 'Saved note';
}

/** Under the title: a link's address, or the note's first line that isn't its title. */
function captureLine(c: Capture): string {
  if (c.url) return c.url;
  const title = captureTitle(c);
  return c.content?.split('\n').find((l) => l.trim() && l.trim() !== title)?.trim() ?? '';
}

/** What Enter copies: a link's address, else the note's text, else its title. */
function captureCopy(c: Capture): string {
  if (c.type === 'LINK' && c.url) return c.url;
  return c.content?.trim() || c.title?.trim() || c.url || '';
}

const captureHas = (c: Capture, terms: string[]) => terms.every((t) => [c.title, c.content, c.url].some((x) => x?.toLowerCase().includes(t)));

/**
 * Ctrl+K → Find (LOOP_V2_SPEC §8 "Ctrl+K also searches quick notes"): type to search every note,
 * pinned first, then the notes and links saved with Ctrl K (the inbox and the ones being revised,
 * searched on the server), then the docs (DOC_PAGES_PLAN N6: a page says the docs above it). Enter
 * or a click copies a note (its first code block, else the whole note; a link's address) and
 * closes; a doc opens. A link also opens (its Open button, or Ctrl+Enter).
 */
export function NoteFinder({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const notes = useLearningStore((s) => s.data?.quickNotes);
  const status = useLearningStore((s) => s.status);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  /** The last capture search: what it asked and what came back (kept while the next one runs). */
  const [captures, setCaptures] = useState<{ q: string; items: Capture[] } | null>(null);
  /** The last doc search, the same way. */
  const [docHits, setDocHits] = useState<{ q: string; items: DocSearchHit[] } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Away from Home the store may be empty: load today's payload once (it carries the notes).
  useEffect(() => {
    if (!useLearningStore.getState().data) void useLearningStore.getState().load();
  }, []);

  const q = query.trim();
  const terms = useMemo(() => q.toLowerCase().split(/\s+/).filter(Boolean), [q]);

  useEffect(() => {
    if (q.length < CAPTURE_MIN_CHARS) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      learningApi
        .listCaptures({ q, limit: MAX_CAPTURES }, ctrl.signal)
        .then((items) => setCaptures({ q, items }))
        // A failed search leaves the saved ones out; the notes still work.
        .catch(() => !ctrl.signal.aborted && setCaptures({ q, items: [] }));
      docApi
        .searchDocs(q, { signal: ctrl.signal })
        .then((items) => setDocHits({ q, items: items.slice(0, MAX_DOCS) }))
        .catch(() => !ctrl.signal.aborted && setDocHits({ q, items: [] }));
    }, 150);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const results = useMemo<Result[]>(() => {
    const all = (notes ?? []).filter((n) => n.content.trim() !== '');
    const hits = terms.length ? all.filter((n) => terms.every((t) => n.content.toLowerCase().includes(t))) : all.filter((n) => n.isPinned);
    const noteHits = hits
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, MAX_RESULTS)
      .map((note): Result => ({ kind: 'note', note }));
    // While the next search runs, the last answer narrows by the words typed since.
    const saved = q.length >= CAPTURE_MIN_CHARS && captures ? captures.items.filter((c) => captureHas(c, terms)) : [];
    // The server matches word forms ("caches" finds "Caching"): its own answer stands; an older one only narrows.
    const docs = q.length >= CAPTURE_MIN_CHARS && docHits ? (docHits.q === q ? docHits.items : q.startsWith(docHits.q) ? docHits.items.filter((d) => docHas(d, terms)) : []) : [];
    return [...noteHits, ...saved.map((capture): Result => ({ kind: 'capture', capture })), ...docs.map((doc): Result => ({ kind: 'doc', doc }))];
  }, [notes, terms, q, captures, docHits]);

  const settled = q.length < CAPTURE_MIN_CHARS || (captures?.q === q && docHits?.q === q);
  const firstCapture = results.findIndex((r) => r.kind === 'capture');
  const firstDoc = results.findIndex((r) => r.kind === 'doc');
  const notesEnd = [firstCapture, firstDoc].filter((i) => i >= 0)[0] ?? results.length;

  const done = async (text: string, label: string) => {
    if (await copyText(text)) {
      toast.success(`Copied “${label}”`);
      onClose();
    } else {
      toast.error('The browser blocked the clipboard. Select the text and copy it instead.');
    }
  };

  const openDoc = (d: DocSearchHit) => {
    onClose();
    router.push(`/docs/${d._id}`);
  };

  /** Enter or a click: a note or a saved one is copied, a doc opens. */
  const choose = (r: Result) =>
    r.kind === 'note'
      ? void done(primaryCopyText(r.note.content), noteLabel(r.note.content).trim() || 'note')
      : r.kind === 'capture'
        ? void done(captureCopy(r.capture), captureTitle(r.capture))
        : openDoc(r.doc);

  const open = (c: Capture) => {
    if (!c.url) return;
    window.open(c.url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(results.length - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1)));
      setActive(next);
      listRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[active];
      if (!r) return;
      if ((e.ctrlKey || e.metaKey) && r.kind === 'capture' && r.capture.url) open(r.capture);
      else choose(r);
    }
  };

  return (
    <div className="rounded-2xl bg-[hsl(var(--popover))] shadow-[0_0_0_1px_var(--border-subtle),0_10px_30px_-5px_rgba(0,0,0,0.3)] overflow-hidden" onKeyDown={onKeyDown}>
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[color:var(--border-subtle)]">
        <Search className="w-[18px] h-[18px] text-[var(--ui-ink-3)] shrink-0" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder="Find a note, a link or a doc"
          aria-label="Find a note, a link or a doc"
          aria-controls="note-finder-results"
          aria-activedescendant={results[active] ? `note-finder-${active}` : undefined}
          className="flex-1 bg-transparent text-[16px] text-[var(--ui-ink-1)] placeholder:text-[var(--ui-ink-3)] outline-none"
        />
      </div>
      <ul ref={listRef} id="note-finder-results" role="listbox" aria-label="Notes and links" className="max-h-[340px] overflow-y-auto p-1.5">
        {!notes && status !== 'error' && <li className="px-3 py-3 text-[14px] text-[var(--ui-ink-3)]">Loading your notes…</li>}
        {!notes && status === 'error' && <li className="px-3 py-3 text-[14px] text-[var(--ui-ink-2)]">Couldn’t load your notes. Close this and try again.</li>}
        {notes && results.length === 0 && settled && (
          <li className="px-3 py-3 text-[14px] text-[var(--ui-ink-2)]">{q ? `No notes, links or docs match “${q}”.` : 'Pinned notes show here. Type to search every note, saved link and doc.'}</li>
        )}
        {results.slice(0, notesEnd).map((r, i) => {
          if (r.kind !== 'note') return null;
          const n = r.note;
          const sub = secondLine(n);
          return (
            <li
              key={n._id}
              id={`note-finder-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(r)}
              className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer', i === active ? 'bg-[var(--ui-selected)]' : 'hover:bg-[var(--ui-hover)]')}
            >
              {n.isPinned ? <Pin className="w-4 h-4 shrink-0 text-[var(--ui-ink-3)]" aria-label="Pinned" /> : <span className="w-4 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="break-words text-[15px] leading-snug text-[var(--ui-ink-1)]">{noteLabel(n.content).trim() || 'Note'}</p>
                {sub && <p className="break-all font-mono text-[12.5px] leading-snug text-[var(--ui-ink-3)]">{sub}</p>}
              </div>
              {i === active && <CopyHint />}
            </li>
          );
        })}
        {firstCapture >= 0 && (
          <li role="presentation">
            <p aria-hidden className={cn('px-3 pb-1 text-[12px] font-[500] text-[var(--ui-ink-3)]', firstCapture > 0 ? 'pt-2.5' : 'pt-1.5')}>
              Saved notes and links
            </p>
            <ul role="group" aria-label="Saved notes and links">
              {results.slice(firstCapture, firstDoc >= 0 ? firstDoc : undefined).map((r, j) => {
                if (r.kind !== 'capture') return null;
                const i = firstCapture + j;
                const c = r.capture;
                const line = captureLine(c);
                const Icon = c.type === 'LINK' ? Link2 : StickyNote;
                return (
                  <li
                    key={c._id}
                    id={`note-finder-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(r)}
                    className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer', i === active ? 'bg-[var(--ui-selected)]' : 'hover:bg-[var(--ui-hover)]')}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-[var(--ui-ink-3)]" aria-label={c.type === 'LINK' ? 'Link' : 'Saved note'} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[15px] leading-snug text-[var(--ui-ink-1)]">{captureTitle(c)}</p>
                      {(line || c.subject) && (
                        <p className={cn('text-[12.5px] leading-snug text-[var(--ui-ink-3)]', c.url ? 'break-all' : 'break-words')}>
                          {[line, c.subject?.name].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    {c.url && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          open(c);
                        }}
                        title="Open the link (Ctrl+Enter)"
                        className="flex h-7 shrink-0 items-center gap-1.5 rounded-[6px] px-2 text-[12px] text-[var(--ui-ink-3)] transition-colors hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden /> Open
                      </button>
                    )}
                    {i === active && <CopyHint />}
                  </li>
                );
              })}
            </ul>
          </li>
        )}
        {firstDoc >= 0 && (
          <li role="presentation">
            <p aria-hidden className={cn('px-3 pb-1 text-[12px] font-[500] text-[var(--ui-ink-3)]', firstDoc > 0 ? 'pt-2.5' : 'pt-1.5')}>
              Docs
            </p>
            <ul role="group" aria-label="Docs">
              {results.slice(firstDoc).map((r, j) => {
                if (r.kind !== 'doc') return null;
                const i = firstDoc + j;
                const d = r.doc;
                return (
                  <li
                    key={d._id}
                    id={`note-finder-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(r)}
                    className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer', i === active ? 'bg-[var(--ui-selected)]' : 'hover:bg-[var(--ui-hover)]')}
                  >
                    <FileText className="w-4 h-4 shrink-0 text-[var(--ui-ink-3)]" aria-label="Doc" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[15px] leading-snug text-[var(--ui-ink-1)]">{d.title.trim() || 'Untitled'}</p>
                      {/* A page says the docs above it (DOC_PAGES_PLAN N6). */}
                      {!!d.path?.length && <p className="break-words text-[12.5px] leading-snug text-[var(--ui-ink-3)]">in {d.path.join(' › ')}</p>}
                    </div>
                    {i === active && <OpenHint />}
                  </li>
                );
              })}
            </ul>
          </li>
        )}
      </ul>
    </div>
  );
}

function OpenHint() {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--ui-ink-3)]">
      <CornerDownLeft className="w-3.5 h-3.5" aria-hidden /> Open
    </span>
  );
}

function CopyHint() {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--ui-ink-3)]">
      <Copy className="w-3.5 h-3.5" aria-hidden /> Copy
    </span>
  );
}
