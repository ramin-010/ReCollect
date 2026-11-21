'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { RcButton } from '@/components/rc-ui';
import { buddyApi, type BuddyImport } from '@/lib/api/buddyApi';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

/**
 * Keeps only his own messages from an export before it leaves the browser (Claude: `chat_messages` from the
 * human; ChatGPT: `mapping` nodes by the user), in the export's own shape, so the server reads the same file
 * it would have and the upload stays small.
 */
function ownMessagesOnly(data: unknown): unknown {
  if (!Array.isArray(data)) return data;
  return data.map((c) => {
    if (!c || typeof c !== 'object') return c;
    const o = c as Record<string, unknown>;
    if (Array.isArray(o.chat_messages)) {
      return { uuid: o.uuid, name: o.name, chat_messages: (o.chat_messages as Array<Record<string, unknown>>).filter((m) => m?.sender === 'human').map((m) => ({ uuid: m.uuid, sender: m.sender, text: m.text, content: m.content, created_at: m.created_at })) };
    }
    if (o.mapping && typeof o.mapping === 'object') {
      const mine = Object.fromEntries(
        Object.entries(o.mapping as Record<string, { message?: { author?: { role?: string } } }>).filter(([, n]) => n?.message?.author?.role === 'user'),
      );
      return { id: o.id, conversation_id: o.conversation_id, title: o.title, mapping: mine };
    }
    return c;
  });
}

/**
 * Stage 8 (E5): bring in a chat export from Claude or ChatGPT. Only his own messages leave the browser; the
 * server says what it holds and what reading it costs; nothing is read until he says yes, up to his limit.
 */
export function ImportChats() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [imports, setImports] = useState<BuddyImport[] | null>(null);
  const [limit, setLimit] = useState('');

  const load = () =>
    buddyApi.imports().then(
      (list) => setImports(list),
      () => setImports([]),
    );
  useEffect(() => {
    void load();
  }, []);
  // Stage 11: Home's first run links here (/you#you-import): it scrolls into view once it is on the page.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.location.hash === '#you-import') root.current?.scrollIntoView({ block: 'center' });
  }, []);

  const pick = async (file: File) => {
    setBusy(true);
    try {
      const data = ownMessagesOnly(JSON.parse(await file.text()));
      const est = await buddyApi.importChats(data, file.name);
      setLimit(est.estimateUsd.toFixed(2));
      await load();
    } catch {
      toast.error('That file could not be read. Choose conversations.json from a Claude or ChatGPT export.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const approve = async (id: string) => {
    const usd = Number(limit);
    if (!Number.isFinite(usd) || usd <= 0) return;
    setBusy(true);
    try {
      await buddyApi.approveImport(id, Math.min(usd, 20));
      toast.success('It is reading them now, the newest first.');
      await load();
    } catch {
      toast.error('That didn’t start. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    setBusy(true);
    try {
      await buddyApi.cancelImport(id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const open = imports?.find((i) => i.state === 'estimated') ?? null;
  const running = imports?.find((i) => i.state === 'queued' && i.waiting > 0) ?? null;
  return (
    <div className="you-setting" id="you-import" ref={root}>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Bring in your other chats</p>
        <p className="rc-meta mt-0.5">An export from Claude or ChatGPT (conversations.json). Only your own messages are read, with their dates; old plans become history, never questions.</p>
        {open && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="rc-meta text-[var(--rc-ink-1)]">
              {`${open.messages} of your messages in ${open.chats} ${open.chats === 1 ? 'chat' : 'chats'}`}
              {open.oldest && open.newest ? ` (${MONTH.format(new Date(open.oldest))} to ${MONTH.format(new Date(open.newest))})` : ''}
              {open.known ? `, ${open.known} already known` : ''}
              {` · about ${USD.format(open.estimateUsd)} to read`}
            </p>
            <label className="rc-meta flex items-center gap-1.5">
              up to $
              <input className="rc-input w-[72px]" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} aria-label="Spend at most (dollars)" />
            </label>
            <RcButton size="sm" busy={busy} onClick={() => void approve(open._id)}>
              Bring them in
            </RcButton>
            <RcButton size="sm" variant="quiet" disabled={busy} onClick={() => void cancel(open._id)}>
              Not now
            </RcButton>
          </div>
        )}
        {running && (
          <div className="mt-2 flex items-center gap-2">
            <p className="rc-meta">{`Reading: ${running.queued - running.waiting} of ${running.queued} pieces done`}</p>
            <RcButton size="sm" variant="quiet" disabled={busy} onClick={() => void cancel(running._id)}>
              Stop
            </RcButton>
          </div>
        )}
      </div>
      {!open && (
        <>
          <input ref={input} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose an export file" onChange={(e) => e.target.files?.[0] && void pick(e.target.files[0])} />
          <RcButton size="sm" variant="outline" busy={busy} onClick={() => input.current?.click()}>
            Choose a file
          </RcButton>
        </>
      )}
    </div>
  );
}
