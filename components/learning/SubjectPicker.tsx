'use client';

import { useEffect, useRef, useState } from 'react';
import { Book, Check, ChevronRight, FileText, Inbox, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubjectWithTopics } from '@/lib/learning/types';

interface SubjectPickerProps {
  subjects: SubjectWithTopics[];
  subjectId: string | null;
  topicId: string | null;
  onChange: (subjectId: string | null, topicId: string | null) => void;
  /** Open the dropdown upwards (inside the Ctrl+K palette it sits low on the page). */
  dropUp?: boolean;
}

const active = 'text-indigo-400 bg-indigo-500/10 font-medium';
const idle = 'text-[var(--ui-ink-3)] hover:text-[var(--ui-ink-1)]';

/**
 * Revise LevelSelector: a breadcrumb pill Inbox › Subject › Topic. "Inbox" (Revise's
 * "Dashboard") = no subject; a capture saved there lands in the Inbox tab.
 */
export function SubjectPicker({ subjects, subjectId, topicId, onChange, dropUp = false }: SubjectPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const subject = subjects.find((s) => s._id === subjectId);
  const topic = subject?.topics.find((t) => t._id === topicId);
  const pick = (s: string | null, t: string | null) => {
    onChange(s, t);
    setIsOpen(false);
  };
  const item = (selected: boolean) =>
    cn('flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-left text-[12px] font-medium transition-colors', selected ? 'bg-indigo-500/10 text-indigo-300' : 'text-[var(--ui-ink-2)] hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center h-[26px] bg-[var(--ui-hover)] hover:bg-[var(--ui-selected)] border border-[color:var(--border-subtle)] rounded-full px-1.5 transition-all group"
        title="Where this capture goes"
      >
        <span
          onClick={(e) => {
            e.stopPropagation();
            pick(null, null);
          }}
          className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors cursor-pointer', !subjectId ? active : idle)}
        >
          <Inbox className="w-3 h-3" />
          <span className="text-[11px]">Inbox</span>
        </span>
        {subject && (
          <>
            <ChevronRight className="w-3 h-3 text-[var(--ui-ink-3)] mx-0.5 shrink-0" />
            <span
              onClick={(e) => {
                e.stopPropagation();
                pick(subject._id, null);
              }}
              className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors cursor-pointer', subjectId && !topicId ? active : idle)}
            >
              <Book className="w-3 h-3" />
              <span className="max-w-[90px] truncate text-[11px]">{subject.name}</span>
            </span>
          </>
        )}
        {subject && topic && (
          <>
            <ChevronRight className="w-3 h-3 text-[var(--ui-ink-3)] mx-0.5 shrink-0" />
            <span className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full', active)}>
              <FileText className="w-3 h-3" />
              <span className="max-w-[90px] truncate text-[11px]">{topic.title}</span>
            </span>
          </>
        )}
        {!topicId && (
          <>
            <span className="w-px h-3.5 bg-[var(--ui-selected)] mx-1.5" />
            <span className="px-1 text-[var(--ui-ink-3)] group-hover:text-[var(--ui-ink-1)] transition-colors flex items-center">
              <Plus className="w-3.5 h-3.5" />
            </span>
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 w-64 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#1e1e1e] border border-[color:var(--border-subtle)] rounded-xl shadow-xl flex flex-col p-1 z-[110]',
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <div className="px-2 py-1.5 text-[10px] font-semibold text-[var(--ui-ink-3)] uppercase tracking-wider">{subjectId ? 'Change level or select topic' : 'Select subject'}</div>
          <button type="button" onClick={() => pick(null, null)} className={item(!subjectId)}>
            <span className="flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5" /> Inbox (no subject)
            </span>
            {!subjectId && <Check className="w-3 h-3" />}
          </button>
          {subject ? (
            <div className="mt-1">
              <button type="button" onClick={() => pick(subject._id, null)} className={item(!topicId)}>
                <span className="flex items-center gap-2 min-w-0">
                  <Book className="w-3.5 h-3.5 opacity-70" />
                  <span className="truncate">{subject.name}</span>
                </span>
                {!topicId && <Check className="w-3 h-3" />}
              </button>
              {subject.topics.length === 0 ? (
                <div className="pl-7 pr-2 py-1.5 text-[11px] text-[var(--ui-ink-3)] italic">No topics found</div>
              ) : (
                subject.topics.map((t) => (
                  <button type="button" key={t._id} onClick={() => pick(subject._id, t._id)} className={cn(item(topicId === t._id), 'pl-7')}>
                    <span className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3 h-3 opacity-50" />
                      <span className="truncate">{t.title}</span>
                    </span>
                    {topicId === t._id && <Check className="w-3 h-3" />}
                  </button>
                ))
              )}
            </div>
          ) : (
            subjects.map((s) => (
              <button type="button" key={s._id} onClick={() => pick(s._id, null)} className={cn(item(false), 'mt-1')}>
                <span className="flex items-center gap-2 min-w-0">
                  <Book className="w-3.5 h-3.5 opacity-70" />
                  <span className="truncate">{s.name}</span>
                </span>
              </button>
            ))
          )}
          {subjects.length === 0 && <div className="px-2 py-3 text-center text-[11px] text-[var(--ui-ink-3)]">No subjects found.</div>}
        </div>
      )}
    </div>
  );
}
