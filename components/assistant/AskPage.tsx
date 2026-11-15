'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowUp, CalendarCheck, ChartNoAxesColumn, FilePlus2, LoaderCircle, MessageSquareText, RotateCw, Square, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton, RcSkel, rcScope } from '@/components/rc-ui';
import { SectionFailed } from '@/components/learning/home/parts';
import { assistantApi, AskError, type AssistantMessage, type AssistantTool } from '@/lib/api/assistantApi';
import { useAskThreads } from '@/lib/store/askThreadsStore';
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


/**
 * Ask AI (MANAGER_AND_DOCS_PLAN §3.4): he asks, the manager acts through the same tools his agents
 * use. The conversations are in the main sidebar (Chats, as in Notion); the open one in a 720 column;
 * each tool call as a row (changes with Undo, actions that need his tap as cards); what each answer
 * cost under it.
 */
export function AskPage() {
  const router = useRouter();
  const params = useSearchParams();
  const urlThread = params.get('t');
  const urlAsk = params.get('q');

  const threads = useAskThreads((s) => s.threads);
  const loadThreads = useAskThreads((s) => s.load);
  const upsertThread = useAskThreads((s) => s.upsert);
  const [activeId, setActiveId] = useState<string | null>(urlThread);
  const [messages, setMessages] = useState<AssistantMessage[] | null | 'failed'>(urlThread ? null : []);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [usage, setUsage] = useState<AiUsage | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** The thread this page just made by sending: its URL change must not reload it. */
  const madeHere = useRef<string | null>(null);
  const askedFromUrl = useRef<string | null>(null);
  const sending = useRef(false);

  const setTopBar = useTopBar((s) => s.setTopBar);
  const clearTopBar = useTopBar((s) => s.clearTopBar);

  // The conversation list (shared with the sidebar's Chats; the title in the top bar comes from it).
  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const refreshUsage = useCallback(() => {
    recallApi.usage().then(setUsage, () => setUsage(null));
  }, []);
  useEffect(refreshUsage, [refreshUsage]);

  // The URL names the open conversation (?t=); a new chat has none.
  useEffect(() => {
    if (urlThread === activeId && (messages !== null || urlThread === null)) return;
    setActiveId(urlThread);
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
              upsertThread({ _id: t._id, title: t.title });
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
    [activeId, refreshUsage, router, scrollToEnd, upsertThread],
  );

  // Ctrl K → "Ask": /ask?q=… starts a new conversation with it.
  useEffect(() => {
    if (!urlAsk || askedFromUrl.current === urlAsk) return;
    askedFromUrl.current = urlAsk;
    router.replace('/ask', { scroll: false });
    void send(urlAsk);
  }, [urlAsk, router, send]);

  // The sidebar's "New chat" (it links here; the URL change clears the page): the box takes the focus.
  useEffect(() => {
    const onNew = () => {
      if (sending.current) return;
      madeHere.current = null;
      focusInput();
    };
    document.addEventListener('recollect:new-chat', onNew);
    return () => document.removeEventListener('recollect:new-chat', onNew);
  }, []);

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
      <section className="ask-main">
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

/**
 * What he did after the answer: its words may still say "tap Do it" or "Undo above" (written before
 * he chose), so a quiet line under it says what happened since. Tapping Do it needs no line.
 */
function sinceWords(tools: AssistantTool[]): string | null {
  const undone = tools.filter((t) => t.undone).length;
  const dismissed = tools.filter((t) => t.action?.status === 'dismissed').length;
  const parts: string[] = [];
  if (dismissed) parts.push(dismissed === 1 ? 'dismissed the action' : `dismissed ${dismissed} actions`);
  if (undone) parts.push(undone === 1 ? 'undid the change' : `undid ${undone} changes`);
  return parts.length ? `Since then, you ${parts.join(' and ')}.` : null;
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
      {sinceWords(message.tools) && <p className="ask-meta ask-since">{sinceWords(message.tools)}</p>}
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
