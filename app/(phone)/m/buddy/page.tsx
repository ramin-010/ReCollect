'use client';

/**
 * Buds, the chat with the buddy (PHONE_APP_REDESIGN_PLAN §5, §8; step 4), on the Ask AI engine: the latest chat
 * goes on, a new one starts from the pen. The buddy's words in the serif, theirs in a tinted bubble; what it did
 * shows as a receipt with Undo. Today's Tell opens it ready to type (?tell=1); a text shared to the phone app arrives in
 * the field (?q=). Inside the phone app the mic speaks into the field (Android's own recognizer, through the shell).
 */
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUp, Check, Mic, SquarePen, Square } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { assistantApi, AskError, type AssistantMessage, type AssistantTool } from '@/lib/api/assistantApi';
import { buddyApi } from '@/lib/api/buddyApi';
import { clockWords, dayWords } from '@/components/phone/parts';
import { listen, useShell } from '@/components/phone/shell';
import { useKept } from '@/components/phone/kept';
import { useNoAi } from '@/components/ai/NoAiNotice';

interface Shown {
  key: string;
  role: 'user' | 'assistant';
  text: string;
  tools: AssistantTool[];
  at: string;
}
const shownOf = (m: AssistantMessage): Shown => ({ key: m._id, role: m.role, text: m.text, tools: m.tools ?? [], at: m.createdAt });
const paragraphs = (text: string) => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
/** The field fits its words, up to five lines (typed, spoken, shared in, or emptied after a send). */
const fit = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
};

function Receipt({ tool }: { tool: AssistantTool }) {
  const [undone, setUndone] = useState(false);
  const undo = async () => {
    if (!tool.editId) return;
    try {
      await axiosInstance.post(`/api/agent/edits/${encodeURIComponent(tool.editId)}/undo`);
      setUndone(true);
    } catch {
      toast.error('It could not be undone. Try from Home.');
    }
  };
  return (
    <div className="receipt">
      <span className="ic">
        <Check className="i" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="row-main">
        {/* The tool's first line, without the id it names for agents. */}
        <p className="row-title">{undone ? 'Undone' : (tool.result || tool.name).split('\n')[0]!.replace(/\s*·\s*id\s+\S+?\.?$/, '')}</p>
        {tool.detail ? <p className="meta">{tool.detail}</p> : null}
      </div>
      {tool.editId && !undone ? (
        <button type="button" className="link" style={{ paddingRight: 10 }} onClick={() => void undo()}>
          Undo
        </button>
      ) : null}
    </div>
  );
}

function Chat() {
  const params = useSearchParams();
  const [name, setName] = useKept<string | null>('buds:name', null);
  const [threadId, setThreadId] = useKept<string | undefined>('buds:thread', undefined);
  const [items, setItems] = useKept<Shown[] | null>('buds:items', null);
  const [text, setText] = useState(params.get('q') ?? '');
  const [busy, setBusy] = useState(false);
  // Stage 10: without AI, one quiet line instead of a box that would only fail.
  const noAi = useNoAi();
  const stopRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  const shell = useShell();

  // Today's Tell: the field is ready, the keyboard up.
  useEffect(() => {
    if (params.get('tell') === '1') fieldRef.current?.focus();
  }, [params]);

  // The mic: what Android heard goes into the field (after what is there), to read over before sending.
  const speak = async () => {
    const heard = await listen();
    if (!heard) return;
    setText((t) => (t.trim() ? `${t.trimEnd()} ${heard}` : heard));
  };
  useEffect(() => {
    if (fieldRef.current) fit(fieldRef.current);
  }, [text]);

  useEffect(() => {
    let alive = true;
    buddyApi.today().then((d) => alive && setName(d.name), () => undefined);
    assistantApi
      .listThreads()
      .then(async (threads) => {
        const latest = threads.find((t) => !(t as { docId?: string | null }).docId);
        if (!latest) return alive && setItems([]);
        const full = await assistantApi.getThread(latest._id);
        if (!alive) return;
        setThreadId(full._id);
        setItems(full.messages.map(shownOf));
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [setItems, setName, setThreadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [items]);

  const typing = (on: boolean) => document.querySelector('.pw')?.classList.toggle('is-typing', on);

  const send = async () => {
    const clean = text.trim();
    if (!clean || busy) return;
    setText('');
    setBusy(true);
    const now = new Date().toISOString();
    const replyKey = `reply-${now}`;
    setItems((list) => [...(list ?? []), { key: `mine-${now}`, role: 'user', text: clean, tools: [], at: now }, { key: replyKey, role: 'assistant', text: '', tools: [], at: now }]);
    const patchReply = (fn: (r: Shown) => Shown) => setItems((list) => (list ?? []).map((m) => (m.key === replyKey ? fn(m) : m)));
    const ctl = new AbortController();
    stopRef.current = ctl;
    let round = 0;
    let words = '';
    try {
      await assistantApi.send(
        { threadId, text: clean },
        {
          onThread: (t) => setThreadId(t._id),
          onTool: (tool) => patchReply((r) => ({ ...r, tools: [...r.tools, tool] })),
          onDelta: (d) => {
            if (d.round !== round) {
              round = d.round;
              words = '';
            }
            words += d.text;
            patchReply((r) => ({ ...r, text: words }));
          },
          onDone: (done) => patchReply(() => ({ ...shownOf(done.message), key: replyKey })),
        },
        ctl.signal,
      );
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') toast.error(err instanceof AskError ? err.message : 'It was not sent. Try again.');
      setItems((list) => (list ?? []).filter((m) => m.key !== replyKey || m.text));
    } finally {
      stopRef.current = null;
      setBusy(false);
    }
  };

  const fresh = () => {
    setThreadId(undefined);
    setItems([]);
  };

  return (
    <>
      <header className="bar" style={{ padding: '0 8px 0 20px' }}>
        <span className="mark lg" aria-hidden>
          {(name ?? 'Buddy').charAt(0).toUpperCase()}
        </span>
        <p className="bar-title" style={{ marginLeft: 10 }}>
          {name ?? 'Your buddy'}
        </p>
        <span className="grow" />
        <button type="button" className="icon-btn" aria-label="A new chat" onClick={fresh}>
          <SquarePen className="i" strokeWidth={1.75} aria-hidden />
        </button>
      </header>
      <div className="scroll">
        <div className="chat">
          {items === null ? (
            <div className="skeleton" aria-busy="true">
              <i style={{ height: 22, width: '70%' }} />
              <i style={{ height: 44, marginTop: 14 }} />
            </div>
          ) : items.length === 0 ? (
            <p className="meta daymark">Say anything: a plan, how a day went, a reminder you want.</p>
          ) : (
            items.map((m, i) => (
              <div key={m.key}>
                {i === 0 || dayWords(items[i - 1]!.at) !== dayWords(m.at) ? (
                  <p className="meta daymark" style={{ marginBottom: 18 }}>
                    {dayWords(m.at).replace(/^./, (c) => c.toUpperCase())}, {clockWords(m.at)}
                  </p>
                ) : null}
                {m.role === 'user' ? (
                  <p className="mine">{m.text}</p>
                ) : (
                  <>
                    {m.text ? (
                      <div className="say voice">
                        {paragraphs(m.text).map((p, k) => (
                          <p key={k}>{p}</p>
                        ))}
                      </div>
                    ) : busy && i === items.length - 1 ? (
                      <div className="skeleton" aria-busy="true">
                        <i style={{ height: 18, width: '50%' }} />
                      </div>
                    ) : null}
                    {m.tools
                      .filter((t) => t.ok && t.level >= 2)
                      .map((t, k) => (
                        <div key={k} style={{ marginTop: 14 }}>
                          <Receipt tool={t} />
                        </div>
                      ))}
                  </>
                )}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>
      {noAi ? (
        <div className="composer">
          <p className="voice-s">Your buddy needs AI. Add your own Claude key in the web app’s Settings › AI, or connect your own Claude: it has the same tools.</p>
        </div>
      ) : (
      <div className="composer">
        <div className="field">
          <textarea
            ref={fieldRef}
            rows={1}
            value={text}
            placeholder={`Message ${name ?? 'your buddy'}`}
            aria-label={`Message ${name ?? 'your buddy'}`}
            onChange={(e) => {
              setText(e.target.value);
            }}
            onFocus={() => typing(true)}
            onBlur={() => typing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 700) {
                e.preventDefault();
                void send();
              }
            }}
          />
          {shell?.voice ? (
            <button type="button" className="icon-btn" aria-label="Speak" onMouseDown={(e) => e.preventDefault()} onClick={() => void speak()}>
              <Mic className="i" strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
        {/* Send and Stop keep the field focused (the keyboard stays, the tab bar stays away): no jump under the tap. */}
        {busy ? (
          <button type="button" className="send" aria-label="Stop" onMouseDown={(e) => e.preventDefault()} onClick={() => stopRef.current?.abort()}>
            <Square className="i" strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <button type="button" className="send" aria-label="Send" disabled={!text.trim()} onMouseDown={(e) => e.preventDefault()} onClick={() => void send()}>
            <ArrowUp className="i" strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>
      )}
    </>
  );
}

export default function BudsScreen() {
  return (
    <Suspense fallback={null}>
      <Chat />
    </Suspense>
  );
}
