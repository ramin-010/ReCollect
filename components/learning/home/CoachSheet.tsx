'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Flag, Plus, Target, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RcButton, RcSheet, RcSkel } from '@/components/rc-ui';
import { aiApi, type CoachNote } from '@/lib/api/aiApi';
import { AI_PAUSED_WORDS, recallErrorKind } from '@/lib/api/recallApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { formatStampDay } from '@/components/docs/page/format';

/** The note's four parts, each with a mark in its tone (the owner, 11-22: "make it readable"). */
const LINES: { key: keyof CoachNote['lines']; label: string; Icon: LucideIcon; tone: string }[] = [
  { key: 'strong', label: 'Going well', Icon: TrendingUp, tone: 'text-[var(--rc-good)]' },
  { key: 'slipping', label: 'Slipping', Icon: TrendingDown, tone: 'text-[var(--rc-attn)]' },
  { key: 'fix', label: 'The one fix', Icon: Target, tone: 'text-[var(--rc-ink-1)]' },
  { key: 'deadline', label: 'Your deadline', Icon: Flag, tone: 'text-[var(--rc-ink-2)]' },
];

/** A part's sentences, one bullet each ("Monday was … . When you sit down …" reads as two points). */
function points(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'])/)
    .map((t) => t.trim())
    .filter(Boolean);
}

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
          : kind === 'paused'
            ? AI_PAUSED_WORDS
            : kind === 'not-configured'
            ? 'The coach needs AI: add your own Claude key in Settings › AI.'
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
        <div className="flex flex-col gap-4">
          {LINES.map(({ key, label, Icon, tone }) => {
            const list = points(note.lines[key]);
            return (
              <section
                key={key}
                aria-label={label}
                className={cn(key === 'fix' ? 'rounded-[12px] bg-[color-mix(in_srgb,var(--rc-ink-1)_4%,transparent)] px-3.5 py-3' : 'border-b border-[var(--rc-line)] pb-4')}
              >
                <h3 className="flex items-center gap-2 text-[13px] font-[600] text-[var(--rc-ink-1)]">
                  <Icon className={cn('h-[15px] w-[15px] shrink-0', tone)} strokeWidth={2} aria-hidden />
                  {label}
                </h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {list.map((t, i) => (
                    <li key={i} className="flex gap-2.5 text-[15px] leading-[1.5] text-[var(--rc-ink-1)]">
                      <span aria-hidden className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--rc-ink-3)]" />
                      <span className="min-w-0">{t}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <section aria-label="Focus lines to try" className="pt-1">
            <h3 className="text-[13px] font-[600] text-[var(--rc-ink-1)]">Focus lines to try</h3>
            <ol className="mt-1.5 flex flex-col">
              {note.focus.map((f, i) => (
                <li key={f} className="rc-row rc-hoverable -mx-2 flex items-start gap-3 px-2 py-[7px]">
                  <span className="rc-num mt-[1px] grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--rc-ink-1)_8%,transparent)] text-[12px] font-[600] text-[var(--rc-ink-2)]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] leading-[1.5]">{f}</span>
                  {added.has(i) ? (
                    <span className="rc-meta inline-flex shrink-0 items-center gap-1 pt-[2px]">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Added
                    </span>
                  ) : (
                    <RcButton size="sm" variant="quiet" icon={<Plus className="h-4 w-4" />} onClick={() => void addFocus(i, f)}>
                      Add to today
                    </RcButton>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </RcSheet>
  );
}
