'use client';

import Link from 'next/link';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { RcButton } from '@/components/rc-ui';
import type { NextUp } from '@/lib/learning/types';
import { PathMark, studyPrompt } from '../PathMark';
import { LabelLine } from './parts';

/**
 * Next up (SYNC_SPINE_SPEC 1.1): each path's next topic, at most three, goal-linked first. The row
 * opens the subject's path; "Copy prompt" puts a ready prompt for a study chat on the clipboard.
 * Hidden when no path has a next topic.
 */
export function NextUpSection({ next }: { next: NextUp[] | undefined }) {
  if (!next?.length) return null;
  return (
    <section aria-labelledby="next-h">
      <LabelLine id="next-h" title="Next up" />
      <ul className="flex flex-col">
        {next.map((n) => (
          <NextUpRow key={n.subject._id} n={n} />
        ))}
      </ul>
    </section>
  );
}

function NextUpRow({ n }: { n: NextUp }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(studyPrompt(n.subject.name, n.topic, n.nextStep));
      toast.success('Prompt copied', { description: 'Paste it into a study chat to continue this topic.' });
    } catch {
      toast.error('Could not copy the prompt');
    }
  };
  return (
    <li className="rc-row rc-hoverable group -mx-2 grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-[7px]">
      <PathMark status={n.topic.status} />
      <Link href={`/docs?subject=${encodeURIComponent(n.subject._id)}`} className="min-w-0 outline-none" aria-label={`${n.topic.title}: open the ${n.subject.name} path`}>
        <span className="text-[var(--rc-fs-body)] font-medium leading-[1.4] text-[var(--rc-ink-1)] break-words">{n.topic.title}</span>
        <span className="rc-meta ml-2 break-words">
          <span className="rc-swatch mr-1.5 align-[1px]" style={{ background: n.subject.color ?? 'var(--rc-icon)' }} aria-hidden />
          {n.subject.name} · topic {n.topic.position} of {n.total}
          {n.nextStep ? ` · next: ${n.nextStep}` : ''}
        </span>
      </Link>
      <RcButton size="sm" variant="quiet" className="-my-1" icon={<Copy />} onClick={() => void copy()} title="Copy a prompt that starts a study chat on this topic">
        Copy prompt
      </RcButton>
    </li>
  );
}

/**
 * What comes next on each path, as plain rows (the owner, 11-21): shown in Today's focus only on a
 * day with no task due. A row opens the subject's path; no prompt to copy.
 */
export function NextUpRows({ next }: { next: NextUp[] | undefined }) {
  if (!next?.length) return null;
  return (
    <ul aria-label="Next up">
      {next.map((n) => (
        <li key={n.subject._id}>
          <Link
            href={`/docs?subject=${encodeURIComponent(n.subject._id)}`}
            className="rc-row rc-hoverable group -mx-2 flex items-baseline gap-3 rounded-[6px] px-2 py-[7px] no-underline"
            title={n.nextStep ? `Next: ${n.nextStep}` : undefined}
          >
            <PathMark status={n.topic.status} className="translate-y-[3px]" />
            <span className="min-w-0 flex-1">
              <span className="text-[var(--rc-fs-body)] leading-[1.4] text-[var(--rc-ink-1)] decoration-1 underline-offset-[3px] group-hover:underline">{n.topic.title}</span>
              <span className="rc-meta"> · {n.subject.name}</span>
            </span>
            <span className="rc-meta rc-num shrink-0">
              next up · {n.topic.position} of {n.total}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
