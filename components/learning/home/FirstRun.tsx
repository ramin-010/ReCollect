'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcButton } from '@/components/rc-ui';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { firstRunApi, type FirstRun as FirstRunData, type FirstRunStep } from '@/lib/api/firstRunApi';

/**
 * Home's first run (ECOSYSTEM_V2_PLAN stage 11, §9.6 item 2): a new account's few steps to make Recollect its own,
 * each ticked by what the person really did (the time zone by their "Looks right"). Gone once every step is done,
 * after "Hide this", or 30 days after the account was made. Nothing shows for anyone else.
 */
export function FirstRun({ className }: { className?: string }) {
  const [data, setData] = useState<FirstRunData | null>(null);
  const openSettings = (tab: string) => {
    useSettingsStore.getState().setActiveTab(tab);
    useSettingsStore.getState().setIsOpen(true);
  };

  useEffect(() => {
    let live = true;
    firstRunApi.get().then(
      (d) => live && setData(d),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);

  if (!data?.show) return null;

  const update = async (patch: { zoneOk?: true; dismissed?: true }) => {
    try {
      setData(await firstRunApi.update(patch));
    } catch {
      toast.error('That didn’t save. Try again.');
    }
  };

  const STEP: Record<FirstRunStep, { title: string; text: string; action: React.ReactNode }> = {
    zone: {
      title: 'Check your time zone',
      text: `Your days, reviews and reminders run on ${data.zone.replace(/_/g, ' ')}.`,
      action: (
        <>
          <RcButton size="sm" variant="outline" onClick={() => void update({ zoneOk: true })}>
            Looks right
          </RcButton>
          <RcButton size="sm" variant="quiet" onClick={() => openSettings('profile')}>
            Change
          </RcButton>
        </>
      ),
    },
    buddy: {
      title: 'Tell your buddy something',
      text: 'What you’re learning, what’s coming up. It remembers, and follows up when it helps.',
      action: (
        <Link href="/ask" className="rc-btn rc-btn--outline rc-btn--sm">
          Open Ask AI
        </Link>
      ),
    },
    connect: {
      title: 'Connect your own Claude',
      text: 'Claude Code, claude.ai or ChatGPT read and write here through Recollect’s tools, and save what matters as you talk.',
      action: (
        <RcButton size="sm" variant="outline" onClick={() => openSettings('agents')}>
          Show me how
        </RcButton>
      ),
    },
    import: {
      title: 'Bring in your other chats',
      text: 'A fast start: an export from Claude or ChatGPT, and your buddy reads your own messages with their dates.',
      action: (
        <Link href="/you?tab=settings#you-import"className="rc-btn rc-btn--quiet rc-btn--sm">
          Bring them in
        </Link>
      ),
    },
  };
  const done = data.steps.filter((s) => s.done).length;

  return (
    <section aria-labelledby="first-run" className={cn('rc-card px-4 pb-2 pt-3.5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="first-run" className="text-[15px] font-[600] text-[var(--rc-ink-1)]">
          Make it yours <span className="rc-meta rc-num font-[500]">{done} of {data.steps.length}</span>
        </h2>
        <button type="button" className="rc-meta hover:text-[var(--rc-ink-1)]" onClick={() => void update({ dismissed: true })}>
          Hide this
        </button>
      </div>
      <ol className="mt-2">
        {data.steps.map((s) => {
          const step = STEP[s.id];
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--rc-line)] py-3 first:border-t-0">
              <span
                aria-hidden
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full',
                  s.done ? 'bg-[var(--rc-ink-2)] text-[var(--rc-surface)]' : 'shadow-[inset_0_0_0_1.5px_var(--rc-line-strong)]',
                )}
              >
                {s.done && <Check className="size-3.5" strokeWidth={2.5} />}
              </span>
              <div className="min-w-0 flex-1 basis-[240px]">
                <p className={cn('text-[15px] font-[500]', s.done ? 'text-[var(--rc-ink-3)] line-through decoration-[var(--rc-line-strong)]' : 'text-[var(--rc-ink-1)]')}>
                  {step.title}
                  <span className="sr-only">{s.done ? ' (done)' : ''}</span>
                </p>
                {!s.done && <p className="rc-meta mt-0.5">{step.text}</p>}
              </div>
              {!s.done && <div className="flex shrink-0 items-center gap-1.5">{step.action}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
