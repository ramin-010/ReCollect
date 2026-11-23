'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, MessageCircle, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcButton, RcIconButton } from '@/components/rc-ui';
import { buddyApi, type BuddyToday } from '@/lib/api/buddyApi';
import { LabelLine } from '@/components/learning/home/parts';
import { WhyNot } from './WhyNot';
import { NoAiNotice, useNoAi } from '@/components/ai/NoAiNotice';
import { voice } from './voice';
import './you.css';

/**
 * The buddy on Home (BUDDY_MEMORY_PLAN §3.4), the day's opening under the date (the owner, 11-21; a
 * quiet line in body type so the date leads, its thumbs and "more" shown on hover or focus):
 * its questions and the line for now on the open page; the night's note, the line to tell it
 * something and "What it knows" open under the line. With nothing to say it is one quiet row to
 * tell it something. Each line takes "more like this" / "not this". Hidden while the buddy is off.
 */
const PREVIEW_LINE: NonNullable<BuddyToday['line']> = {
  slot: 'preview',
  text: 'You finished the queues topic yesterday. Two DSA reviews are waiting; knapsack first, it’s been 17 days.',
  form: 'line',
  lockOk: false,
  fallback: true,
  dayId: 'preview',
};

export function BuddyCard({ inline = false }: { inline?: boolean } = {}) {
  const router = useRouter();
  const [loaded, setData] = useState<BuddyToday | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, 'more' | 'less'>>({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [more, setMore] = useState(false);
  // Stage 5b: after a "not this", the row of reasons (on a line or the note by its target; on a question by its id).
  const [why, setWhy] = useState<{ kind: 'line'; target: string } | { kind: 'ask'; id: string; text: string } | null>(null);
  // Stage 10: without AI the buddy never thinks: one quiet line instead of "it thinks tonight" and a Tell that waits forever.
  const noAi = useNoAi();

  useEffect(() => {
    let alive = true;
    // `?buddy=preview` (the owner, 11-22): on a day with no line, a sample one, to judge the layout. Display
    // only: it is a fallback line, so it takes no thumbs and nothing is written.
    const preview = new URLSearchParams(window.location.search).get('buddy') === 'preview';
    const load = () =>
      buddyApi.today().then(
        (d) => alive && setData(preview && d.enabled && !d.paused && !d.line ? { ...d, line: PREVIEW_LINE } : d),
        () => undefined,
      );
    void load();
    // What it shows must still be true (ECOSYSTEM_V2_PLAN §4.13): again on returning to the tab, and
    // every 5 minutes while the tab is in front (each check wakes the server's database).
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 5 * 60_000);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, []);

  // Home's block is never empty (the owner, 11-22): with the buddy off, paused or not loaded yet it shows the Tell
  // row a new account shows (telling works with the buddy off: a note for when it is on).
  const data: BuddyToday | null =
    loaded && loaded.enabled && !loaded.paused
      ? loaded
      : inline
        ? { enabled: true, paused: loaded?.paused ?? false, name: loaded?.name ?? null, loop: loaded?.loop ?? false, slot: loaded?.slot ?? 'morning', line: null, day: null, asks: [] }
        : null;
  if (!data) return null;
  if (noAi) {
    return (
      <section aria-labelledby="buddy-h">
        <LabelLine id="buddy-h" title={data.name ? `From ${data.name}` : 'From your buddy'} />
        <NoAiNotice what="Your buddy" />
      </section>
    );
  }
  const day = data.day;
  const line = data.line;
  const title = data.name ? `From ${data.name}` : 'From your buddy';

  const thumb = async (target: string, verdict: 'more' | 'less') => {
    if (!day) return;
    setThumbs((t) => ({ ...t, [target]: verdict }));
    try {
      await buddyApi.feedback({ buddyDayId: day._id, target, verdict });
      setWhy(verdict === 'less' ? { kind: 'line', target } : null);
    } catch {
      setThumbs((t) => {
        const next = { ...t };
        delete next[target];
        return next;
      });
      toast.error('That didn’t save. Try again.');
    }
  };

  const answerAsk = async (id: string, body: { choice?: number; thumb?: 'less' }) => {
    const before = data;
    const asked = (data.asks ?? []).find((a) => a._id === id);
    setData((d) => (d ? { ...d, asks: (d.asks ?? []).filter((a) => a._id !== id) } : d));
    try {
      await buddyApi.answerAsk(id, body);
      if (body.choice != null) toast.success('Got it.');
      if (body.thumb && asked) setWhy({ kind: 'ask', id, text: asked.text });
    } catch {
      setData(before);
      toast.error('That didn’t save. Try again.');
    }
  };

  const tell = async () => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    // Stage 5 (§4.6): with the loop on, telling it something is a message in its chat, where it answers.
    if (data.loop) {
      router.push(`/ask?q=${encodeURIComponent(clean)}`);
      return;
    }
    setSending(true);
    try {
      const res = (await buddyApi.tell(clean)) as { paused?: boolean } | null;
      if (res?.paused) {
        toast.error('Your buddy is paused. Resume it in Settings to tell it things.');
        return;
      }
      setText('');
      toast.success('Got it. It thinks about it tonight.');
    } catch {
      toast.error('It wasn’t sent. Try again.');
    } finally {
      setSending(false);
    }
  };

  const Thumbs = ({ target }: { target: string }) =>
    day ? (
      <div className="flex shrink-0 items-center gap-0.5">
        <RcIconButton size="sm" label="More like this" aria-pressed={thumbs[target] === 'more'} className={cn(thumbs[target] === 'more' && 'buddy-thumb-on')} onClick={() => void thumb(target, 'more')}>
          <ThumbsUp />
        </RcIconButton>
        <RcIconButton size="sm" label="Not this" aria-pressed={thumbs[target] === 'less'} className={cn(thumbs[target] === 'less' && 'buddy-thumb-on')} onClick={() => void thumb(target, 'less')}>
          <ThumbsDown />
        </RcIconButton>
      </div>
    ) : null;

  const asks = data.asks ?? [];
  // The words that open the day: the buddy's line for now, and nothing when it has none (the owner, 11-23: an older
  // note or a plain stand-in line in its place reads as stale; the phone's Today shows the same).
  const lead: { text: string; target: string | null; big: boolean } | null = line && (!line.fallback || line === PREVIEW_LINE) ? { text: line.text, target: line.fallback ? null : (line.key ?? line.slot), big: true } : null;
  const noteBelow = !!lead && !!day?.note;
  const open = more || !lead;

  const tellForm = (
    <form
      className="flex min-w-0 flex-1 basis-[240px] items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void tell();
      }}
    >
      <input
        className={lead ? 'rc-input flex-1' : 'h-[34px] min-w-0 flex-1 border-0 bg-transparent text-[var(--rc-fs-body)] text-[var(--rc-ink-1)] placeholder:text-[var(--rc-ink-3)] focus-visible:!outline-none'}
        value={text}
        maxLength={1000}
        placeholder={data.loop ? `Tell ${data.name || 'your buddy'} something…` : 'Tell your buddy something…'}
        aria-label="Tell your buddy something"
        onChange={(e) => setText(e.target.value)}
      />
      {(lead || text.trim()) && (
        <RcButton type="submit" size="sm" variant={lead ? 'outline' : 'quiet'} busy={sending} disabled={!text.trim()}>
          Tell
        </RcButton>
      )}
    </form>
  );

  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      {why?.kind === 'ask' && (
        <div className="flex flex-col gap-2 pl-[30px]">
          <p className="text-[14px] text-[var(--rc-ink-3)]">Hidden: “{why.text}”</p>
          <WhyNot
            withWords={false}
            onClose={() => setWhy(null)}
            onReason={async (reason) => {
              await buddyApi.answerAsk(why.id, { thumb: 'less', reason });
              return reason === 'private' ? { offScreens: 'threads' as const } : undefined;
            }}
          />
        </div>
      )}
      {asks.map((ask) => (
        <div key={ask._id} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5">
          <MessageCircle className="mt-[4px] h-[18px] w-[18px] text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
          <p className={cn('min-w-0 text-[18px] font-[500] leading-[1.5] text-[var(--rc-ink-1)]', voice.className)}>{ask.text}</p>
          <RcIconButton size="sm" label="Not this" onClick={() => void answerAsk(ask._id, { thumb: 'less' })}>
            <ThumbsDown />
          </RcIconButton>
          <div className="col-start-2 col-end-4 -ml-2 flex flex-wrap items-center gap-1.5">
            {ask.answers.map((a, i) => (
              <RcButton key={a.label} size="sm" variant="quiet" onClick={() => void answerAsk(ask._id, { choice: i })}>
                {a.label}
              </RcButton>
            ))}
            <Link href={`/ask?ask=${encodeURIComponent(ask._id)}`} className="rc-btn rc-btn--quiet rc-btn--sm">
              Reply
            </Link>
          </div>
        </div>
      ))}

      {lead && inline ? (
        // Inside Home's year card (the owner's placement options, 11-22): one quiet line, no bubble; thumbs and Reply at its end.
        <div className="flex flex-wrap items-start gap-x-2.5">
          <span className="mt-[2px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[var(--rc-main)] text-[11px] font-[700] text-[var(--rc-on-main)]" aria-hidden>
            {(data.name || 'B').charAt(0).toUpperCase()}
          </span>
          <p className={cn('min-w-0 flex-1 text-[15px] leading-[1.5] text-[var(--rc-ink-1)]', voice.className)}>{lead.text}</p>
          {/* On a phone the thumbs and Reply drop under the words, so the words keep the width. */}
          <div className="-my-0.5 -mr-1.5 flex shrink-0 items-center max-sm:-ml-1.5 max-sm:mt-1 max-sm:w-full max-sm:pl-[32px]">
            {lead.target && <Thumbs target={lead.target} />}
            <RcButton size="sm" variant="quiet" aria-expanded={more} onClick={() => setMore((x) => !x)}>
              {more ? 'Less' : noteBelow ? 'Its note' : 'Reply'}
              <ChevronDown className={cn('transition-transform', more && 'rotate-180')} aria-hidden />
            </RcButton>
          </div>
        </div>
      ) : lead ? (
        <div className="grid grid-cols-[28px_minmax(0,1fr)] items-end gap-x-2.5">
          {/* A chat message (the owner, 11-21): the avatar at the bubble's foot, the bubble's corner toward it. */}
          <span className="mb-[30px] grid h-7 w-7 place-items-center rounded-full bg-[var(--rc-main)] text-[12px] font-[700] text-[var(--rc-on-main)]" aria-hidden>
            {(data.name || 'B').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                'w-fit max-w-full rounded-[16px] rounded-bl-[4px] bg-[var(--rc-surface-2)] px-3.5 py-2.5 leading-[1.5] text-[var(--rc-ink-1)]',
                voice.className,
                lead.big ? 'text-[16px] font-[500]' : 'text-[15px] font-[400]',
              )}
            >
              {lead.text}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--rc-ink-3)]">
              <span className="px-1">{data.name || 'Buddy'}</span>
              {lead.target && <Thumbs target={lead.target} />}
              <RcButton size="sm" variant="quiet" aria-expanded={more} onClick={() => setMore((x) => !x)}>
                {more ? 'Less' : noteBelow ? 'Its note' : 'Reply'}
                <ChevronDown className={cn('transition-transform', more && 'rotate-180')} aria-hidden />
              </RcButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="rc-hoverable -mx-2 flex items-center gap-3 px-2">
          <MessageCircle className="h-[18px] w-[18px] shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
          {tellForm}
          <Link href="/you" className="rc-btn rc-btn--quiet rc-btn--sm -mr-2 shrink-0">
            What it knows
          </Link>
        </div>
      )}
      {why?.kind === 'line' && lead?.target && why.target === lead.target && day && (
        <div className="pl-[38px]">
          <WhyNot onClose={() => setWhy(null)} onReason={(reason, words) => buddyApi.feedback({ buddyDayId: day._id, target: why.target, verdict: 'less', reason, ...(words ? { words } : {}) })} />
        </div>
      )}

      {lead && open && (
        <div className="flex flex-col gap-2.5 pl-[38px]">
          {noteBelow && day?.note && (
            <div className="flex items-start gap-3">
              <p className={cn('min-w-0 flex-1 text-[16px] leading-[1.55] text-[var(--rc-ink-2)]', voice.className)}>{day.note}</p>
              <div className="-mr-1.5">
                <Thumbs target="note" />
              </div>
            </div>
          )}
          {noteBelow && why?.kind === 'line' && why.target === 'note' && day && (
            <WhyNot onClose={() => setWhy(null)} onReason={(reason, words) => buddyApi.feedback({ buddyDayId: day._id, target: 'note', verdict: 'less', reason, ...(words ? { words } : {}) })} />
          )}
          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
            {tellForm}
            <Link href="/you" className="rc-btn rc-btn--quiet rc-btn--sm -mr-2 shrink-0">
              What it knows
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
