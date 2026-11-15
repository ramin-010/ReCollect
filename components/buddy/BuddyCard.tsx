'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcButton, RcIconButton } from '@/components/rc-ui';
import { buddyApi, type BuddyToday } from '@/lib/api/buddyApi';
import { SectionHead } from '@/components/learning/home/parts';
import './you.css';

/**
 * Home's buddy card (BUDDY_MEMORY_PLAN §3.4): the line for now and the night's note, each with "more
 * like this" / "not this", and one line to tell it something. Hidden while the buddy is off.
 */
export function BuddyCard() {
  const [data, setData] = useState<BuddyToday | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, 'more' | 'less'>>({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    buddyApi.today().then(
      (d) => alive && setData(d),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!data || !data.enabled || data.paused) return null;
  const day = data.day;
  const line = data.line;
  const title = data.name ? `From ${data.name}` : 'From your buddy';

  const thumb = async (target: string, verdict: 'more' | 'less') => {
    if (!day) return;
    setThumbs((t) => ({ ...t, [target]: verdict }));
    try {
      await buddyApi.feedback({ buddyDayId: day._id, target, verdict });
    } catch {
      setThumbs((t) => {
        const next = { ...t };
        delete next[target];
        return next;
      });
      toast.error('That didn’t save. Try again.');
    }
  };

  const tell = async () => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
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
        {line ? (
          <div className="flex items-start gap-3">
            <p className="min-w-0 flex-1 text-[17px] font-medium leading-[1.4] text-[var(--rc-ink-1)]">{line.text}</p>
            {!line.fallback && <Thumbs target={line.slot} />}
          </div>
        ) : (
          <p className="text-[15px] rc-ink-2">{day ? 'Nothing more to say for now.' : 'It writes its first lines after it thinks tonight.'}</p>
        )}
        {day?.note && (
          <div className="flex items-start gap-3 border-t border-[var(--rc-line)] pt-3">
            <p className="min-w-0 flex-1 text-[15px] leading-[1.5] text-[var(--rc-ink-2)]">{day.note}</p>
            <Thumbs target="note" />
          </div>
        )}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void tell();
          }}
        >
          <input className="rc-input flex-1" value={text} maxLength={1000} placeholder="Tell your buddy something…" aria-label="Tell your buddy something" onChange={(e) => setText(e.target.value)} />
          <RcButton type="submit" size="sm" busy={sending} disabled={!text.trim()}>
            Tell
          </RcButton>
        </form>
      </div>
    </section>
  );
}
