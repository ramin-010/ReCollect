'use client';

import { useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Check, Copy, Pin, PinOff, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock } from '@/lib/learning/dates';
import type { QuickNote } from '@/lib/learning/types';
import { useLearningStore } from '@/lib/store/learningStore';
import { NoteAttachment } from './NoteAttachment';
import { NoteContent } from './NoteContent';
import { lx } from './styles';

/** Revise NoteBlock (history mode): time, chat bubble, double-click to edit, copy / pin / delete under it. */
export function QuickNoteItem({ note, timezone }: { note: QuickNote; timezone: string }) {
  const { saveQuickNote, toggleQuickNotePin, deleteQuickNote } = useLearningStore.getState();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = () => {
    setDraft(note.content);
    setIsEditing(true);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }, 0);
  };

  const commitEdit = async () => {
    setIsEditing(false);
    if (draft !== note.content && (draft.trim() || note.attachments.length)) {
      await saveQuickNote({ _id: note._id, content: draft, category: note.category, attachments: note.attachments });
    } else {
      setDraft(note.content);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(note.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const actionBtn = cn('p-1.5 rounded-md transition-colors', lx.hover);

  return (
    <div className="group flex items-start gap-2 w-full relative">
      <div className="flex flex-col items-end w-14 shrink-0 pr-2 pb-6 -mt-1">
        <span className="text-[10px] leading-none font-medium text-[hsl(var(--foreground))]/40 select-none">{formatClock(note.createdAt, timezone)}</span>
      </div>
      <div className="flex-1 min-w-0 pb-2 pl-2">
        <div
          className={cn(
            'relative inline-flex flex-col rounded-2xl rounded-tl-none px-4 py-3 min-w-[60px] max-w-full shadow-sm border bg-[hsl(var(--card))]',
            lx.border,
            isEditing && 'w-full',
            note.isOptimistic && 'opacity-80',
          )}
        >
          {/* WhatsApp-style tail */}
          <svg className="absolute top-0 -left-[10px] w-[10px] h-[16px] text-[hsl(var(--card))]" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
            <path d="M10 0H0C5 0 10 5 10 16V0Z" />
          </svg>
          {note.isPinned && (
            <div className="flex items-center gap-1 mb-1.5 -mt-0.5">
              <Pin className={cn('w-2.5 h-2.5', lx.muted)} />
              <span className={cn('text-[9px] font-semibold uppercase tracking-wider', lx.muted)}>Pinned</span>
            </div>
          )}
          {note.content &&
            (isEditing ? (
              <TextareaAutosize
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void commitEdit();
                  }
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setIsEditing(false);
                    setDraft(note.content);
                  }
                }}
                onBlur={() => void commitEdit()}
                className={cn('w-full bg-transparent resize-none outline-none text-[14px] leading-relaxed !overflow-hidden', lx.fg90)}
              />
            ) : (
              <div onDoubleClick={startEdit} className="w-full bg-transparent cursor-text" title="Double click to edit">
                <NoteContent content={note.content} />
              </div>
            ))}
          {note.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {note.attachments.map((att, i) => (
                <NoteAttachment key={`${att.url}-${i}`} attachment={att} />
              ))}
            </div>
          )}
        </div>

        {/* Actions sit under the bubble so they never cover its content */}
        <div className="flex items-center gap-0.5 h-8 -ml-1 pt-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1 p-1 bg-[hsl(var(--card))] border border-[hsl(var(--destructive))]/25 rounded-lg shadow-sm">
              <span className="text-[11px] text-[hsl(var(--destructive))] font-medium px-1.5 select-none">Delete?</span>
              <button
                onClick={() => {
                  setIsConfirmingDelete(false);
                  void deleteQuickNote(note._id);
                }}
                className="p-1 hover:bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))] rounded transition-colors"
                title="Yes, delete"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsConfirmingDelete(false)} className={cn('p-1 rounded transition-colors', lx.muted, lx.hover)} title="Cancel">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {note.content.trim() !== '' && (
                <button onClick={copy} className={cn(actionBtn, 'text-[hsl(var(--foreground))]/40 hover:text-[hsl(var(--foreground))]/80')} title="Copy note">
                  {isCopied ? <Check className="w-3.5 h-3.5 text-[hsl(var(--success))]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={() => void toggleQuickNotePin(note._id)}
                className={cn(actionBtn, note.isPinned ? lx.primaryText : 'text-[hsl(var(--foreground))]/40 hover:text-[hsl(var(--foreground))]/80')}
                title={note.isPinned ? 'Unpin note' : 'Pin note'}
              >
                {note.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="p-1.5 rounded-md hover:bg-[hsl(var(--destructive))]/10 text-[hsl(var(--foreground))]/40 hover:text-[hsl(var(--destructive))] transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
