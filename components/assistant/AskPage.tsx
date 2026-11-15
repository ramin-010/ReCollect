'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowUp, CalendarCheck, ChartNoAxesColumn, FilePlus2, LoaderCircle, MessageSquareText, PanelLeft, RotateCw, Square, SquarePen, Trash2, CircleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton, RcConfirm, RcIconButton, RcSkel, rcScope } from '@/components/rc-ui';
import { FadeText } from '@/components/rc-ui/FadeText';
import { SectionFailed } from '@/components/learning/home/parts';
import { assistantApi, AskError, type AssistantMessage, type AssistantThread, type AssistantTool } from '@/lib/api/assistantApi';
import { agentApi } from '@/lib/api/agentApi';
import { learningApi } from '@/lib/api/learningApi';
import { recallApi, type AiUsage } from '@/lib/api/recallApi';
import { useTopBar } from '@/lib/store/topBarStore';
import { AskMarkdown } from './AskMarkdown';
import { ActionCard, ToolRow } from './AskTools';
import { costWords, money } from './askFormat';
import './ask.css';

/** The turn in flight: his words, the tools as they finish, and a failure when there is one. */
interface Pending {
  text: string;
  tools: AssistantTool[];
  error: string | null;
  /** The stream had begun: his message is kept on the server. */
  kept: boolean;
  /** The model's words of its current step, as they arrive (a new step starts them again). */
  streamed?: string;
  round?: number;
  /** The thread it runs in (for Stop), and whether he pressed it. */
  threadId?: string;
  stopping?: boolean;
}

const STARTERS = [
  { icon: CalendarCheck, text: "What's due today, and what should I do first?" },
  { icon: ChartNoAxesColumn, text: 'How did my week go?' },
  { icon: FilePlus2, text: 'Make a note on ', fill: true },
  { icon: MessageSquareText, text: "Move tomorrow's reviews to Sunday" },
];


const DAY_MS = 86_400_000;
function groupOf(updatedAt: string, now: Date): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(updatedAt).getTime();
  if (t >= start) return 'Today';
  if (t >= start - DAY_MS) return 'Yesterday';
  if (t >= start - 7 * DAY_MS) return 'Previous 7 days';
  return 'Older';
}

/**
 * Ask AI (MANAGER_AND_DOCS_PLAN §3.4): he asks, the manager acts through the same tools his agents
 * use. Conversations on the left; the open one in a 720 column; each tool call as a row (changes
 * with Undo, actions that need his tap as cards); what each answer cost under it.
 */
export function AskPage() {
  const router = useRouter();
  const params = useSearchParams();
  const urlThread = params.get('t');
  const urlAsk = params.get('q');

  const [threads, setThreads] = useState<AssistantThread[] | null | 'failed'>(null);
  const [threadsAttempt, setThreadsAttempt] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(urlThread);
  const [messages, setMessages] = useState<AssistantMessage[] | null | 'failed'>(urlThread ? null : []);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [showThreads, setShowThreads] = useState(false);
  const [toDelete, setToDelete] = useState<AssistantThread | null>(null);
  const [deleting, setDeleting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** The thread this page just made by sending: its URL change must not reload it. */
  const madeHere = useRef<string | null>(null);
  const askedFromUrl = useRef<string | null>(null);
  const sending = useRef(false);

  const setTopBar = useTopBar((s) => s.setTopBar);
  const clearTopBar = useTopBar((s) => s.clearTopBar);

  // The conversation list.
  useEffect(() => {
    let alive = true;
    assistantApi.listThreads().then(
      (t) => alive && setThreads(t),
      () => alive && setThreads('failed'),
    );
    return () => {
      alive = false;
    };
  }, [threadsAttempt]);

  const refreshUsage = useCallback(() => {
    recallApi.usage().then(setUsage, () => setUsage(null));
  }, []);
  useEffect(refreshUsage, [refreshUsage]);

  // The URL names the open conversation (?t=); a new chat has none.
  useEffect(() => {
    if (urlThread === activeId && (messages !== null || urlThread === null)) return;
    setActiveId(urlThread);
    setShowThreads(false);
    if (urlThread && urlThread === madeHere.current) return;
    setPending(null);
    setMessages(urlThread ? null : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlThread]);

  useEffect(() => {
    if (!activeId || activeId === madeHere.current) return;
    let alive = true;
    setMessages(null);
    assistantApi.getThread(activeId).then(
      (t) => alive && setMessages(t.messages),
      () => alive && setMessages('failed'),
    );
    return () => {
      alive = false;
    };
  }, [activeId, loadAttempt]);

  const activeThread = Array.isArray(threads) ? threads.find((t) => t._id === activeId) ?? null : null;

  // The top bar: "Ask AI / <the conversation>".
  useEffect(() => {
    setTopBar({ crumbs: activeThread ? [{ label: 'Ask AI', href: '/ask' }, { label: activeThread.title }] : [{ label: 'Ask AI' }] });
  }, [setTopBar, activeThread]);
  useEffect(() => clearTopBar, [clearTopBar]);

  const scrollToEnd = useCallback((smooth: boolean) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Opening a conversation shows its end.
  useLayoutEffect(() => {
    if (Array.isArray(messages) && !pending) scrollToEnd(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messages === null]);

  const nearEnd = () => {
    const el = scrollRef.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 30);

  /** His Stop: the turn ends where it is; what it did stays (each change with its Undo), and the answer comes as usual. */
  const stopTurn = useCallback((threadId: string) => {
    setPending((p) => (p ? { ...p, stopping: true } : p));
    void assistantApi.stop(threadId).catch(() => {
      setPending((p) => (p ? { ...p, stopping: false } : p));
      toast.error("It couldn't be stopped. It will finish on its own.");
    });
  }, []);

  const send = useCallback(
    async (raw: string, opts: { retry?: boolean } = {}) => {
      const text = raw.trim();
      if (!text || sending.current) return;
      sending.current = true;
      if (!opts.retry) setDraft('');
      setPending({ text, tools: [], error: null, kept: false });
      requestAnimationFrame(() => scrollToEnd(false));
      let threadId = activeId;
      try {
        await assistantApi.send(
          { ...(threadId ? { threadId } : {}), text },
          {
            onThread: (t) => {
              setPending((p) => (p ? { ...p, kept: true, threadId: t._id } : p));
              if (!threadId) {
                threadId = t._id;
                madeHere.current = t._id;
                setActiveId(t._id);
                setMessages((m) => (Array.isArray(m) ? m : []));
                router.replace(`/ask?t=${t._id}`, { scroll: false });
              }
              const now = new Date().toISOString();
              setThreads((list) => {
                const rest = Array.isArray(list) ? list.filter((x) => x._id !== t._id) : [];
                const old = Array.isArray(list) ? list.find((x) => x._id === t._id) : undefined;
                return [{ _id: t._id, title: t.title, createdAt: old?.createdAt ?? now, updatedAt: now }, ...rest];
              });
            },
            onTool: (tool) => {
              const follow = nearEnd();
              setPending((p) => (p ? { ...p, tools: [...p.tools, tool] } : p));
              if (follow) requestAnimationFrame(() => scrollToEnd(true));
            },
            onDelta: ({ text: piece, round }) => {
              const follow = nearEnd();
              setPending((p) => (p ? { ...p, streamed: p.round === round ? `${p.streamed ?? ''}${piece}` : piece, round } : p));
              if (follow) requestAnimationFrame(() => scrollToEnd(false));
            },
            onDone: ({ message }) => {
              const follow = nearEnd();
              const mine: AssistantMessage = { _id: `you-${message._id}`, role: 'user', text, tools: [], costUsd: null, createdAt: message.createdAt };
              setMessages((m) => [...(Array.isArray(m) ? m : []), mine, message]);
              setPending(null);
              refreshUsage();
              if (follow) requestAnimationFrame(() => scrollToEnd(true));
            },
          },
        );
      } catch (err) {
        const words = err instanceof AskError ? err.message : 'Something went wrong. Try again.';
        setPending((p) => (p ? { ...p, error: words } : p));
      } finally {
        sending.current = false;
        focusInput();
      }
    },
    [activeId, refreshUsage, router, scrollToEnd],
  );

  // Ctrl K → "Ask": /ask?q=… starts a new conversation with it.
  useEffect(() => {
    if (!urlAsk || askedFromUrl.current === urlAsk) return;
    askedFromUrl.current = urlAsk;
    router.replace('/ask', { scroll: false });
    void send(urlAsk);
  }, [urlAsk, router, send]);

  const newChat = () => {
    if (sending.current) return;
    madeHere.current = null;
    setPending(null);
    setMessages([]);
    setActiveId(null);
    setShowThreads(false);
    router.push('/ask', { scroll: false });
    focusInput();
  };

  const retry = () => {
    if (!pending) return;
    const text = pending.text;
    // His message was kept when the stream had begun; the answer is what is asked for again.
    setPending(null);
    void send(text, { retry: true });
  };

  // A tool's state lives in its message (or in the turn in flight).
  const patchTool = (where: string, index: number, patch: Partial<AssistantTool>) => {
    if (where === 'pending') {
      setPending((p) => (p ? { ...p, tools: p.tools.map((t, i) => (i === index ? { ...t, ...patch } : t)) } : p));
      return;
    }
    setMessages((m) => (Array.isArray(m) ? m.map((msg) => (msg._id !== where ? msg : { ...msg, tools: msg.tools.map((t, i) => (i === index ? { ...t, ...patch } : t)) })) : m));
  };

  const undo = async (where: string, index: number, tool: AssistantTool) => {
    if (!tool.editId) return;
    setBusy(`${where}-${index}`);
    try {
      await agentApi.undoEdit(tool.editId);
      patchTool(where, index, { undone: true });
      toast.success('Undone');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "That couldn't be undone. Try again from Home.");
    } finally {
      setBusy(null);
    }
  };

  const decide = async (where: string, index: number, tool: AssistantTool, accept: boolean) => {
    if (!tool.suggestionId) return;
    setBusy(`${where}-${index}`);
    try {
      const card = accept ? await learningApi.acceptSuggestion(tool.suggestionId) : await learningApi.dismissSuggestion(tool.suggestionId);
      patchTool(where, index, { action: { status: accept ? 'accepted' : 'dismissed', text: tool.action?.text ?? card.text } });
      if (accept) toast.success(card.result || 'Done');
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await assistantApi.deleteThread(toDelete._id);
      setThreads((list) => (Array.isArray(list) ? list.filter((t) => t._id !== toDelete._id) : list));
      if (toDelete._id === activeId) newChat();
      setToDelete(null);
      toast.success('Conversation deleted');
    } catch {
      toast.error("That conversation couldn't be deleted. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  const groups = useMemo(() => {
    if (!Array.isArray(threads)) return [];
    const now = new Date();
    const out: Array<{ label: string; items: AssistantThread[] }> = [];
    for (const t of threads) {
      const label = groupOf(t.updatedAt, now);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(t);
      else out.push({ label, items: [t] });
    }
    return out;
  }, [threads]);

  const isEmpty = Array.isArray(messages) && messages.length === 0 && !pending;

  const composer = (
    <Composer
      inputRef={inputRef}
      value={draft}
      onChange={setDraft}
      onSend={() => void send(draft)}
      disabled={!!pending && !pending.error}
      usage={usage}
      autoFocus
    />
  );

  return (
    <div className={cn(rcScope, 'ask')}>
      {showThreads && <button type="button" aria-label="Close the conversations" className="ask-threads-scrim" onClick={() => setShowThreads(false)} />}
      <aside className="ask-threads" data-open={showThreads || undefined} aria-label="Conversations">
        <div className="ask-threads-head">
          <button type="button" className="ask-new" onClick={newChat}>
            <SquarePen className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            New chat
          </button>
          <RcIconButton label="Close the conversations" size="sm" className="ask-threads-close" onClick={() => setShowThreads(false)}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </RcIconButton>
        </div>
        {threads === null && (
          <div className="flex flex-col gap-2 px-2 pt-4" aria-busy aria-label="Loading your conversations">
            {[0, 1, 2, 3].map((i) => (
              <RcSkel key={i} className="h-[18px] rounded-[6px]" style={{ width: `${86 - i * 12}%` }} />
            ))}
          </div>
        )}
        {threads === 'failed' && (
          <div className="px-2 pt-4">
            <p className="rc-meta">Couldn’t load your conversations.</p>
            <RcButton size="sm" variant="outline" className="mt-2" icon={<RotateCw />} onClick={() => setThreadsAttempt((n) => n + 1)}>
              Try again
            </RcButton>
          </div>
        )}
        {Array.isArray(threads) && threads.length === 0 && <p className="ask-threads-empty">Your conversations show here.</p>}
        {groups.map((g) => (
          <div key={g.label}>
            <p className="ask-group-label">{g.label}</p>
            {g.items.map((t) => (
              <div key={t._id} className="ask-thread" aria-current={t._id === activeId ? 'page' : undefined}>
                <button type="button" className="ask-thread-open" onClick={() => router.push(`/ask?t=${t._id}`, { scroll: false })}>
                  <FadeText title={t.title}>{t.title}</FadeText>
                </button>
                <RcIconButton label="Delete this conversation" size="sm" className="ask-thread-del" onClick={() => setToDelete(t)}>
                  <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </RcIconButton>
              </div>
            ))}
          </div>
        ))}
      </aside>

      <section className="ask-main">
        <div className="ask-narrow-bar">
          <RcButton variant="quiet" size="sm" icon={<PanelLeft className="h-4 w-4" strokeWidth={1.75} />} onClick={() => setShowThreads(true)}>
            Conversations
          </RcButton>
          <RcIconButton label="New chat" size="sm" onClick={newChat}>
            <SquarePen className="h-4 w-4" strokeWidth={1.75} />
          </RcIconButton>
        </div>

        {isEmpty ? (
          <div className="ask-scroll">
            <div className="ask-empty">
              <h1 className="rc-h1">Ask AI</h1>
              <p className="ask-empty-sub">It reads and changes your plan, notes and tasks for you. You can undo every change, and anything final waits for your tap.</p>
              {composer}
              <ul className="ask-starters" aria-label="Ideas to start with">
                {STARTERS.map((s) => (
                  <li key={s.text}>
                    <button
                      type="button"
                      className="ask-starter"
                      onClick={() => {
                        // The words go in at once and the caret waits after them.
                        flushSync(() => setDraft(s.text));
                        const el = inputRef.current;
                        el?.focus();
                        el?.setSelectionRange(s.text.length, s.text.length);
                      }}
                    >
                      <s.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      {s.fill ? `${s.text}…` : s.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="ask-scroll" ref={scrollRef}>
              <div className="ask-column">
                {messages === null && <ConversationSkeleton />}
                {messages === 'failed' && <SectionFailed className="mb-6" what="this conversation" onRetry={() => setLoadAttempt((n) => n + 1)} />}
                {messages !== null && (
                  <div className="ask-turns">
                    {(Array.isArray(messages) ? messages : []).map((m) =>
                      m.role === 'user' ? (
                        <p key={m._id} className="ask-user">
                          {m.text}
                        </p>
                      ) : (
                        <Answer
                          key={m._id}
                          message={m}
                          busy={busy}
                          onUndo={(i, t) => void undo(m._id, i, t)}
                          onDecide={(i, t, a) => void decide(m._id, i, t, a)}
                        />
                      ),
                    )}
                    {pending && (
                      <>
                        <p className="ask-user">{pending.text}</p>
                        <div className="ask-answer" aria-live="polite">
                          {pending.tools.length > 0 && (
                            <Tools
                              tools={pending.tools}
                              where="pending"
                              arriving
                              busy={busy}
                              onUndo={(i, t) => void undo('pending', i, t)}
                              onDecide={(i, t, a) => void decide('pending', i, t, a)}
                            />
                          )}
                          {pending.error ? (
                            <div className="ask-failed" role="alert">
                              <CircleAlert className="ask-failed-icon" strokeWidth={1.75} aria-hidden />
                              <p className="min-w-0 flex-1">{pending.error}</p>
                              <RcButton size="sm" variant="outline" icon={<RotateCw />} onClick={retry}>
                                Try again
                              </RcButton>
                            </div>
                          ) : (
                            <>
                              <div className="ask-working">
                                <LoaderCircle className="ask-working-icon" strokeWidth={1.75} aria-hidden />
                                <span className="ask-working-words">{pending.stopping ? 'Stopping…' : 'Working…'}</span>
                                {pending.threadId && (
                                  <RcButton size="sm" variant="quiet" icon={<Square fill="currentColor" />} disabled={!!pending.stopping} onClick={() => stopTurn(pending.threadId!)}>
                                    Stop
                                  </RcButton>
                                )}
                              </div>
                              {/* The words as they arrive, under the working line (which stays put, Stop with it). */}
                              {pending.streamed?.trim() && <AskMarkdown text={pending.streamed} />}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="ask-dock">{composer}</div>
          </>
        )}
      </section>

      <RcConfirm
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this conversation?"
        body={
          <>
            “{toDelete?.title}” and its messages are deleted for good. What it changed stays; undo those from Home → From your agent.
          </>
        }
        confirmLabel="Delete conversation"
        danger
        busy={deleting}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function Tools({
  tools,
  where,
  arriving,
  busy,
  onUndo,
  onDecide,
}: {
  tools: AssistantTool[];
  where: string;
  arriving?: boolean;
  busy: string | null;
  onUndo: (index: number, tool: AssistantTool) => void;
  onDecide: (index: number, tool: AssistantTool, accept: boolean) => void;
}) {
  return (
    <div className="ask-tools">
      {tools.map((t, i) =>
        t.ok && (t.level === 3 || t.suggestionId) ? (
          <ActionCard key={i} tool={t} arriving={arriving} busy={busy === `${where}-${i}`} onDecide={(a) => onDecide(i, t, a)} />
        ) : (
          <ToolRow key={i} tool={t} arriving={arriving} busy={busy === `${where}-${i}`} onUndo={() => onUndo(i, t)} />
        ),
      )}
    </div>
  );
}

function Answer({
  message,
  busy,
  onUndo,
  onDecide,
}: {
  message: AssistantMessage;
  busy: string | null;
  onUndo: (index: number, tool: AssistantTool) => void;
  onDecide: (index: number, tool: AssistantTool, accept: boolean) => void;
}) {
  const steps = message.tools.length;
  return (
    <div className="ask-answer">
      {steps > 0 && <Tools tools={message.tools} where={message._id} busy={busy} onUndo={onUndo} onDecide={onDecide} />}
      <AskMarkdown text={message.text} />
      {message.costUsd !== null && (
        <p className="ask-meta">
          {costWords(message.costUsd)}
          {steps > 0 && ` · ${steps} ${steps === 1 ? 'step' : 'steps'}`}
        </p>
      )}
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="ask-turns" aria-busy aria-label="Loading the conversation">
      <RcSkel className="ml-auto h-[40px] w-[46%] rounded-[14px]" />
      <div className="flex flex-col gap-2">
        <RcSkel className="h-[16px] w-[38%] rounded-[6px]" />
        <RcSkel className="h-[16px] w-[92%] rounded-[6px]" />
        <RcSkel className="h-[16px] w-[74%] rounded-[6px]" />
      </div>
    </div>
  );
}

function Composer({
  inputRef,
  value,
  onChange,
  onSend,
  disabled,
  usage,
  autoFocus,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  usage: AiUsage | null;
  autoFocus?: boolean;
}) {
  // The box grows with the text, up to about eight lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 208)}px`;
  }, [value, inputRef]);

  const canSend = !!value.trim() && !disabled;
  return (
    <div className="ask-composer-wrap">
      <div className="ask-composer">
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          autoFocus={autoFocus}
          placeholder="Ask, or tell it what to do"
          aria-label="Your message"
          className="ask-input"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />
        <button type="button" className="ask-send" aria-label="Send" title="Send (Enter)" disabled={!canSend} onClick={onSend}>
          <ArrowUp className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      {usage && (
        <p className="ask-spend">
          {money(usage.spentUsd)} of {money(usage.capUsd)} this month
        </p>
      )}
    </div>
  );
}
