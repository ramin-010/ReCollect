'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { RcButton, RcSheet, RcSkel } from '@/components/rc-ui';
import { aiApi, type CoachNote } from '@/lib/api/aiApi';
import { recallErrorKind } from '@/lib/api/recallApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { formatStampDay } from '@/components/docs/page/format';

const LINES: { key: keyof CoachNote['lines']; label: string }[] = [
  { key: 'strong', label: 'Going well' },
  { key: 'slipping', label: 'Slipping' },
  { key: 'fix', label: 'The one fix' },
  { key: 'deadline', label: 'Your deadline' },
];

/**
 * The weekly coach (PLAN §4, D3): five lines on the last 7 days (going well, slipping, the one fix,
 * the deadline, three focus lines) from the app's own evidence. Focus lines join today in one click.
 */
export function CoachSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [note, setNote] = useState<CoachNote | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      setNote(await aiApi.coach());
    } catch {
      setNote(null);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setAdded(new Set());
      void load();
    }
  }, [open, load]);

  const ask = async (fresh: boolean) => {
    setBusy(true);
    try {
      setNote(await aiApi.generateCoach(fresh));
      setAdded(new Set());
    } catch (e) {
      const kind = recallErrorKind(e);
      toast.error(
        kind === 'cap-reached'
          ? 'This month’s AI budget is used up (Settings → AI).'
          : kind === 'not-configured'
            ? 'The AI isn’t set up on the server yet.'
            : 'The coach didn’t answer. Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  };

  const addFocus = async (i: number, text: string) => {
    const ok = await useLearningStore.getState().addFocus(text);
    if (ok) setAdded((cur) => new Set(cur).add(i));
  };

  const fresh = note && Date.now() - new Date(note.createdAt).getTime() < 7 * 86_400_000;

  return (
    <RcSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Your week"
      description={note ? `The 7 days to ${formatStampDay(note.weekEnd)}` : 'A look back at the last 7 days'}
      footer={
        note ? (
          <div className="flex w-full items-center justify-between gap-2">
            <RcButton variant="quiet" busy={busy} onClick={() => void ask(true)}>
              Ask again
            </RcButton>
            <RcButton variant="main" onClick={() => onOpenChange(false)}>
              Done
            </RcButton>
          </div>
        ) : undefined
      }
    >
      {note === undefined || (busy && !note) ? (
        <div aria-busy>
          {busy && <p className="rc-meta mb-3">Reading your week…</p>}
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mb-5">
              <RcSkel className="h-3 w-24" />
              <RcSkel className="mt-2 h-4 w-full" />
              <RcSkel className="mt-1.5 h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : !note || !fresh ? (
        <div>
          <p className="rc-body">
            The coach reads your last 7 days: revisions, recall results, focus lines, the docs you wrote and your goal’s pace. Then it writes four lines and three focus lines for next week.
          </p>
          <RcButton className="mt-4" variant="main" busy={busy} onClick={() => void ask(false)}>
            Ask the coach
          </RcButton>
          {note && <p className="rc-meta mt-3">The last note is more than a week old.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {LINES.map((l) => (
            <div key={l.key}>
              <p className="rc-field-label">{l.label}</p>
              <p className="rc-body mt-1">{note.lines[l.key]}</p>
            </div>
          ))}
          <div>
            <p className="rc-field-label">Focus lines to try</p>
            <ul className="mt-1.5 flex flex-col">
              {note.focus.map((f, i) => (
                <li key={f} className="rc-row rc-hoverable -mx-2 flex items-start justify-between gap-3 px-2 py-[7px]">
                  <span className="rc-body min-w-0">{f}</span>
                  {added.has(i) ? (
                    <span className="rc-meta shrink-0 pt-[2px]">Added to today</span>
                  ) : (
                    <RcButton size="sm" variant="quiet" icon={<Plus className="h-4 w-4" />} onClick={() => void addFocus(i, f)}>
                      Add to today
                    </RcButton>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </RcSheet>
  );
}
