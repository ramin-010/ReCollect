'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcButton, RcIconButton } from '@/components/rc-ui';
import { buddyApi, type BuddyToday } from '@/lib/api/buddyApi';
import { SectionHead } from '@/components/learning/home/parts';
import { WhyNot } from './WhyNot';
import { NoAiNotice, useNoAi } from '@/components/ai/NoAiNotice';
import './you.css';

/**
 * Home's buddy card (BUDDY_MEMORY_PLAN §3.4): the line for now and the night's note, each with "more
 * like this" / "not this", and one line to tell it something. Hidden while the buddy is off.
 */
export function BuddyCard() {
  const router = useRouter();
  const [data, setData] = useState<BuddyToday | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, 'more' | 'less'>>({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // Stage 5b: after a "not this", the row of reasons (on a line or the note by its target; on a question by its id).
  const [why, setWhy] = useState<{ kind: 'line'; target: string } | { kind: 'ask'; id: string; text: string } | null>(null);
  // Stage 10: without AI the buddy never thinks: one quiet line instead of "it thinks tonight" and a Tell that waits forever.
  const noAi = useNoAi();

  useEffect(() => {
    let alive = true;
    const load = () =>
      buddyApi.today().then(
        (d) => alive && setData(d),
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

  if (!data || !data.enabled || data.paused) return null;
  if (noAi) {
    return (
      <section aria-labelledby="buddy-h">
        <SectionHead id="buddy-h" title={data.name ? `From ${data.name}` : 'From your buddy'} />
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
      await buddyApi.tell(clean);
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

  return (
    <section aria-labelledby="buddy-h">
      <SectionHead id="buddy-h" title={title}>
        <Link href="/you" className="rc-btn rc-btn--quiet rc-btn--sm">
          What it knows
        </Link>
      </SectionHead>
      <div className="rc-card flex flex-col gap-3 px-4 py-3.5">
        {why?.kind === 'ask' && (
          <div className="flex flex-col gap-2 border-b border-[var(--rc-line)] pb-3">
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
        {(data.asks ?? []).map((ask) => (
          <div key={ask._id} className="flex flex-col gap-2 border-b border-[var(--rc-line)] pb-3">
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 text-[17px] font-medium leading-[1.4] text-[var(--rc-ink-1)]">{ask.text}</p>
              <RcIconButton size="sm" label="Not this" onClick={() => void answerAsk(ask._id, { thumb: 'less' })}>
                <ThumbsDown />
              </RcIconButton>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
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
        {line ? (
          <div className="flex items-start gap-3">
            <p className="min-w-0 flex-1 text-[17px] font-medium leading-[1.4] text-[var(--rc-ink-1)]">{line.text}</p>
            {!line.fallback && <Thumbs target={line.key ?? line.slot} />}
          </div>
        ) : (
          <p className="text-[15px] rc-ink-2">{day ? 'Nothing more to say for now.' : 'It writes its first lines after it thinks tonight.'}</p>
        )}
        {why?.kind === 'line' && line && why.target === (line.key ?? line.slot) && day && <WhyNot onClose={() => setWhy(null)} onReason={(reason, words) => buddyApi.feedback({ buddyDayId: day._id, target: why.target, verdict: 'less', reason, ...(words ? { words } : {}) })} />}
        {day?.note && (
          <div className="flex items-start gap-3 border-t border-[var(--rc-line)] pt-3">
            <p className="min-w-0 flex-1 text-[15px] leading-[1.5] text-[var(--rc-ink-2)]">{day.note}</p>
            <Thumbs target="note" />
          </div>
        )}
        {why?.kind === 'line' && why.target === 'note' && day && <WhyNot onClose={() => setWhy(null)} onReason={(reason, words) => buddyApi.feedback({ buddyDayId: day._id, target: 'note', verdict: 'less', reason, ...(words ? { words } : {}) })} />}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void tell();
          }}
        >
          <input
            className="rc-input flex-1"
            value={text}
            maxLength={1000}
            placeholder={data.loop ? `Tell ${data.name || 'your buddy'} something…` : 'Tell your buddy something…'}
            aria-label="Tell your buddy something"
            onChange={(e) => setText(e.target.value)}
          />
          <RcButton type="submit" size="sm" busy={sending} disabled={!text.trim()}>
            Tell
          </RcButton>
        </form>
      </div>
    </section>
  );
}
