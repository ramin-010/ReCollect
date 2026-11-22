'use client';

/**
 * The share target (ALWAYS_ON_SPEC 6.7): "Share → Recollect" on the phone opens /share?title&text&url.
 * One small card: the title (editable), the link, "Revise this", Save. A link becomes a link capture,
 * anything else a note; both land in the inbox (Home › All notes) like Ctrl K's.
 */
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Link2, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcSwitch } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';
import { LOG_MINUTES, minutesLabel, sharedForLog } from '@/lib/learning/shareLog';

const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/i;

function ShareCard() {
  const params = useSearchParams();
  const router = useRouter();
  const shared = useMemo(() => {
    const text = (params.get('text') ?? '').trim();
    const url = (params.get('url') ?? '').trim() || text.match(URL_IN_TEXT)?.[0] || '';
    const rest = url ? text.replace(url, '').trim() : text;
    const title = (params.get('title') ?? '').trim() || rest.split('\n')[0]?.slice(0, 120) || '';
    return { url, title, note: rest && rest !== title ? rest : '' };
  }, [params]);
  const [title, setTitle] = useState(shared.title);
  // 11-22 (the owner): a shared problem or video can be logged as time instead (a problem site is practice).
  const forLog = useMemo(() => sharedForLog(params.get('text') ?? '', { url: shared.url, title: shared.title }), [params, shared]);
  const logIt = async (minutes: number) => {
    if (!forLog) return;
    setBusy(true);
    try {
      await learningApi.createSession({ title: title.trim() && forLog.kind === 'study' ? title.trim() : forLog.title, minutes, kind: forLog.kind, ...(forLog.problem ? { problem: forLog.problem } : {}) });
      toast.success(`Logged ${minutesLabel(minutes)} of ${forLog.kind}`);
      router.replace('/');
    } catch {
      toast.error('It wasn’t logged. Check the connection and try again.');
      setBusy(false);
    }
  };
  const [revise, setRevise] = useState(false);
  const [busy, setBusy] = useState(false);
  const nothing = !shared.url && !shared.title && !shared.note;

  const save = async () => {
    setBusy(true);
    try {
      await learningApi.createCapture({
        type: shared.url ? 'LINK' : 'NOTE',
        title: title.trim() || undefined,
        url: shared.url || undefined,
        content: shared.note || undefined,
        revise,
      });
      toast.success(shared.url ? 'Link saved to the inbox' : 'Note saved to the inbox', { description: revise ? 'Its reviews are scheduled.' : 'Find it on Home under All notes › Inbox.' });
      router.replace('/');
    } catch {
      toast.error('It was not saved. Check the connection and try again.');
      setBusy(false);
    }
  };

  return (
    <div className={cn(rcScope, 'mx-auto w-full max-w-[480px] px-4 pt-10 pb-16')}>
      <h1 className="rc-h1">Save to Recollect</h1>
      {nothing ? (
        <p className="rc-body rc-ink-2 mt-2">Nothing came with the share. Share a page or some text to Recollect from another app.</p>
      ) : (
        <div className="rc-card mt-5 p-4">
          <div className="flex items-start gap-3">
            {shared.url ? <Link2 className="mt-1 h-[18px] w-[18px] shrink-0 text-[var(--rc-icon)]" aria-hidden /> : <StickyNote className="mt-1 h-[18px] w-[18px] shrink-0 text-[var(--rc-icon)]" aria-hidden />}
            <div className="min-w-0 flex-1">
              <label htmlFor="share-title" className="sr-only">
                Title
              </label>
              <input id="share-title" className="rc-input w-full" value={title} placeholder={shared.url ? 'Name this link' : 'Name this note'} onChange={(e) => setTitle(e.target.value)} />
              {shared.url && <p className="rc-meta mt-1.5 break-all">{shared.url}</p>}
              {shared.note && <p className="mt-2 whitespace-pre-wrap break-words text-[14px] rc-ink-2">{shared.note.slice(0, 600)}</p>}
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-[14px]">
            <RcSwitch checked={revise} onChange={setRevise} label="Revise this" />
            Revise this
          </label>
        </div>
      )}
      {forLog && (
        <div className="mt-5">
          <p className="text-[14px] rc-ink-2">Or log it as {forLog.kind} time:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LOG_MINUTES.map((m) => (
              <RcButton key={m} size="sm" variant="outline" disabled={busy} onClick={() => void logIt(m)}>
                {minutesLabel(m)}
              </RcButton>
            ))}
          </div>
        </div>
      )}
      <div className="mt-5 flex items-center justify-end gap-2">
        <RcButton variant="quiet" onClick={() => router.replace('/')} disabled={busy}>
          Cancel
        </RcButton>
        {!nothing && (
          <RcButton variant="main" busy={busy} onClick={() => void save()}>
            Save
          </RcButton>
        )}
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense>
      <ShareCard />
    </Suspense>
  );
}
