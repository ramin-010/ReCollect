'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Pin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/lib/store/learningStore';
import type { QuickNote } from '@/lib/learning/types';
import { copyText, primaryCopyText } from './home/NoteBody';
import { noteLabel } from './home/Pocket';

const MAX_RESULTS = 8;

function secondLine(note: QuickNote): string {
  const copy = primaryCopyText(note.content);
  const label = noteLabel(note.content).trim();
  const first = copy.split('\n').find((l) => l.trim() && l.trim() !== label);
  return first?.trim() ?? '';
}

/**
 * Ctrl+K → Find (LOOP_V2_SPEC §8 "Ctrl+K also searches quick notes"): type to search every note,
 * pinned first; Enter or a click copies it (its first code block, else the whole note) and closes.
 */
export function NoteFinder({ onClose }: { onClose: () => void }) {
  const notes = useLearningStore((s) => s.data?.quickNotes);
  const status = useLearningStore((s) => s.status);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Away from Home the store may be empty: load today's payload once (it carries the notes).
  useEffect(() => {
    if (!useLearningStore.getState().data) void useLearningStore.getState().load();
  }, []);

  const results = useMemo(() => {
    const all = (notes ?? []).filter((n) => n.content.trim() !== '');
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hits = terms.length ? all.filter((n) => terms.every((t) => n.content.toLowerCase().includes(t))) : all.filter((n) => n.isPinned);
    return hits.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.createdAt.getTime() - a.createdAt.getTime()).slice(0, MAX_RESULTS);
  }, [notes, query]);

  const copy = async (note: QuickNote) => {
    const label = noteLabel(note.content).trim() || 'note';
    if (await copyText(primaryCopyText(note.content))) {
      toast.success(`Copied “${label}”`);
      onClose();
    } else {
      toast.error('The browser blocked the clipboard. Select the text and copy it instead.');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(results.length - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1)));
      setActive(next);
      listRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const note = results[active];
      if (note) void copy(note);
    }
  };

  return (
    <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[#1c1c1e]/95 shadow-2xl overflow-hidden" onKeyDown={onKeyDown}>
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[color:var(--border-subtle)]">
        <Search className="w-[18px] h-[18px] text-[var(--ui-ink-3)] shrink-0" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder="Find a note or a command"
          aria-label="Find a note or a command"
          aria-controls="note-finder-results"
          aria-activedescendant={results[active] ? `note-finder-${active}` : undefined}
          className="flex-1 bg-transparent text-[16px] text-[var(--ui-ink-1)] placeholder:text-[var(--ui-ink-3)] outline-none"
        />
      </div>
      <ul ref={listRef} id="note-finder-results" role="listbox" aria-label="Notes" className="max-h-[340px] overflow-y-auto p-1.5">
        {!notes && status !== 'error' && <li className="px-3 py-3 text-[14px] text-[var(--ui-ink-3)]">Loading your notes…</li>}
        {!notes && status === 'error' && <li className="px-3 py-3 text-[14px] text-[var(--ui-ink-2)]">Couldn’t load your notes. Close this and try again.</li>}
        {notes && results.length === 0 && (
          <li className="px-3 py-3 text-[14px] text-[var(--ui-ink-2)]">{query.trim() ? `No notes match “${query.trim()}”.` : 'Pinned notes show here. Type to search every note.'}</li>
        )}
        {results.map((n, i) => {
          const label = noteLabel(n.content).trim() || 'Note';
          const sub = secondLine(n);
          return (
            <li
              key={n._id}
              id={`note-finder-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => void copy(n)}
              className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer', i === active ? 'bg-[var(--ui-selected)]' : 'hover:bg-[var(--ui-hover)]')}
            >
              {n.isPinned ? <Pin className="w-4 h-4 shrink-0 text-[var(--ui-ink-3)]" aria-label="Pinned" /> : <span className="w-4 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="break-words text-[15px] leading-snug text-[var(--ui-ink-1)]">{label}</p>
                {sub && <p className="break-all font-mono text-[12.5px] leading-snug text-[var(--ui-ink-3)]">{sub}</p>}
              </div>
              {i === active && (
                <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--ui-ink-3)]">
                  <Copy className="w-3.5 h-3.5" aria-hidden /> Copy
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
