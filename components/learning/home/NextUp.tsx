'use client';

import Link from 'next/link';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { RcButton } from '@/components/rc-ui';
import type { NextUp } from '@/lib/learning/types';
import { PathMark, studyPrompt } from '../PathMark';
import { SectionHead } from './parts';

/**
 * Next up (SYNC_SPINE_SPEC 1.1): each path's next topic, at most three, goal-linked first. The row
 * opens the subject's path; "Copy prompt" puts a ready prompt for a study chat on the clipboard.
 * Hidden when no path has a next topic.
 */
export function NextUpSection({ next }: { next: NextUp[] | undefined }) {
  if (!next?.length) return null;
  return (
    <section aria-labelledby="next-h">
      <SectionHead id="next-h" title="Next up" />
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
    <li className="rc-row rc-hoverable group -mx-2 flex items-start gap-3 px-2 py-[7px]">
      <PathMark status={n.topic.status} className="mt-[1px]" />
      <Link href={`/docs?subject=${encodeURIComponent(n.subject._id)}`} className="min-w-0 flex-1 outline-none" aria-label={`${n.topic.title}: open the ${n.subject.name} path`}>
        <p className="text-[var(--rc-fs-body)] font-medium leading-[1.4] text-[var(--rc-ink-1)] break-words">{n.topic.title}</p>
        <p className="rc-meta mt-0.5 flex flex-wrap items-center gap-x-1.5 break-words">
          <span className="rc-swatch" style={{ background: n.subject.color ?? 'var(--rc-icon)' }} aria-hidden />
          <span>
            {n.subject.name} · topic {n.topic.position} of {n.total}
            {n.nextStep ? ` · next: ${n.nextStep}` : ''}
          </span>
        </p>
      </Link>
      <RcButton size="sm" variant="quiet" icon={<Copy />} onClick={() => void copy()} title="Copy a prompt that starts a study chat on this topic">
        Copy prompt
      </RcButton>
    </li>
  );
}
