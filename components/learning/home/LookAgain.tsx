'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { RcButton } from '@/components/rc-ui';
import { LabelLine } from './parts';

/** A decision whose day to look again has come (LOOP_COMPLETE_SPEC 4.2). */
interface DueDecision {
  _id: string;
  title: string;
  why: string;
  expect: string | null;
  createdAt: string;
  project: { name: string } | null;
}

type Verdict = 'right' | 'mixed' | 'wrong';
const VERDICTS: Array<[Verdict, string]> = [
  ['right', 'Right'],
  ['mixed', 'Mixed'],
  ['wrong', 'Wrong'],
];
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const unwrap = <T,>(res: { data: { data: T } }) => res.data.data;

function DecisionRow({ d, onDone }: { d: DueDecision; onDone: (id: string) => void }) {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    try {
      await axiosInstance.patch(`/api/decisions/${d._id}`, body);
      toast.success(done);
      onDone(d._id);
    } catch {
      toast.error('That did not save. Try again.');
      setBusy(false);
    }
  };

  return (
    <li className="rc-row -mx-2 flex flex-col gap-2 px-2 py-[7px]">
      <div className="min-w-0">
        <p className="text-[var(--rc-fs-body)] leading-[1.4] text-[var(--rc-ink-1)] break-words">{d.title}</p>
        <p className="rc-meta mt-0.5 break-words">
          Decided {DAY.format(new Date(d.createdAt))}
          {d.project ? ` in ${d.project.name}` : ''} because {d.why}
          {d.expect ? ` · you expected: ${d.expect}` : ''}
        </p>
      </div>
      {verdict ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            className="rc-input min-w-[220px] flex-1"
            placeholder="One line on what you learned (optional)"
            aria-label="What you learned, optional"
            value={note}
            maxLength={400}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send({ verdict, verdictNote: note.trim() || null }, 'Saved');
              if (e.key === 'Escape') setVerdict(null);
            }}
          />
          <RcButton size="sm" variant="quiet" disabled={busy} onClick={() => void send({ verdict }, 'Saved')}>
            Skip
          </RcButton>
          <RcButton size="sm" variant="main" busy={busy} onClick={() => void send({ verdict, verdictNote: note.trim() || null }, 'Saved')}>
            Save
          </RcButton>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rc-meta mr-1">Was this right?</span>
          {VERDICTS.map(([v, label]) => (
            <RcButton key={v} size="sm" variant="outline" disabled={busy} onClick={() => setVerdict(v)}>
              {label}
            </RcButton>
          ))}
          <RcButton size="sm" variant="quiet" disabled={busy} onClick={() => void send({ lookAgain: '30d' }, 'Back in 30 days')}>
            Look again in 30 days
          </RcButton>
        </div>
      )}
    </li>
  );
}

/**
 * Look again (LOOP_COMPLETE_SPEC 4.2): a decision whose day has come asks "Was this right?" once:
 * Right · Mixed · Wrong (then an optional line), or look again in 30 days. Hidden when none is due;
 * never a count to clear.
 */
export function LookAgain() {
  const [due, setDue] = useState<DueDecision[]>([]);

  useEffect(() => {
    let alive = true;
    axiosInstance.get('/api/decisions', { params: { due: 1 } }).then(
      (res) => alive && setDue(unwrap<DueDecision[]>(res)),
      () => alive && setDue([]),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!due.length) return null;
  return (
    <section aria-labelledby="look-again-h">
      <LabelLine id="look-again-h" title="Look again" />
      <ul className="flex flex-col gap-1">
        {due.slice(0, 3).map((d) => (
          <DecisionRow key={d._id} d={d} onDone={(id) => setDue((cur) => cur.filter((x) => x._id !== id))} />
        ))}
      </ul>
    </section>
  );
}
