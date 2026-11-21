'use client';

/**
 * You on the phone (PHONE_APP_REDESIGN_PLAN §5, step 3), on real data: what the buddy is keeping an eye on (each
 * thread with its history and its controls in a sheet), what it remembers (lasting, and this month's), and where
 * it hears them (the ear meter). The same reads and writes as the web app's /you.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BellOff, Bot, Check, Clock, EyeOff, Globe, Lock, MessageCircle, Moon, Pause, Smartphone, SlidersHorizontal, StickyNote, Terminal, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { buddyApi, type BuddyThread, type BuddyThreadDetail, type ThreadPatch, type YouData } from '@/lib/api/buddyApi';
import { SOURCE_WORDS, agoWords, dayWords } from '@/components/phone/parts';
import { useKept } from '@/components/phone/kept';

type Pane = 'mind' | 'mem' | 'hears';
const OPEN = new Set(['noticed', 'active', 'committed', 'paused']);
const SOURCE_ICON: Record<string, typeof Terminal> = { hook: Terminal, ask_ai: MessageCircle, doc_ask: MessageCircle, answer: Smartphone, connector: Globe, import: Upload, pocket: StickyNote, agent: Bot, tell: MessageCircle };
const VIA_WORDS: Record<string, string> = { hook: 'in Claude Code', ask_ai: 'in Ask AI', doc_ask: 'in a doc', answer: 'answering a question', tell: 'by Tell', agent: 'passed on by an agent', connector: 'from your other AI apps', import: 'in an old chat', pocket: 'in your pocket notes', app: 'in the app', you: 'by you' };
const KIND_WORDS: Record<string, string> = { progress: 'did some', done: 'did it', skipped: 'skipped it', changed: 'changed the plan', paused: 'paused it', resumed: 'took it up again', dropped: 'let it go', finished: 'finished it', answered: 'answered', steer: 'said how to treat it' };
const shortDate = (day: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00`));
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function ThreadTags({ t }: { t: BuddyThread }) {
  const today = todayLocal();
  return (
    <div className="tags">
      {t.stage === 'committed' ? (
        <span className="tag good">
          <Check className="i s" strokeWidth={2} aria-hidden />
          You committed
        </span>
      ) : null}
      {t.stage === 'paused' ? (
        <span className="tag">
          <Pause className="i s" strokeWidth={2} aria-hidden />
          Paused
        </span>
      ) : null}
      {t.lookAgainOn && t.lookAgainOn.slice(0, 10) <= today ? (
        <span className="tag attention">
          <Clock className="i s" strokeWidth={2} aria-hidden />
          Today
        </span>
      ) : null}
      {t.quietUntil && t.quietUntil.slice(0, 10) > today ? (
        <span className="tag">
          <Moon className="i s" strokeWidth={2} aria-hidden />
          Quiet until {shortDate(t.quietUntil.slice(0, 10))}
        </span>
      ) : null}
      {t.noAsk ? (
        <span className="tag">
          <BellOff className="i s" strokeWidth={2} aria-hidden />
          Never asks about it
        </span>
      ) : null}
      {t.sensitive ? (
        <span className="tag">
          <Lock className="i s" strokeWidth={2} aria-hidden />
          Private
        </span>
      ) : null}
      {!t.onScreens ? (
        <span className="tag">
          <EyeOff className="i s" strokeWidth={2} aria-hidden />
          Never on your screens
        </span>
      ) : null}
      <span className="meta">
        Since {dayWords(t.firstDay)}
        {t.lookAgainOn && t.lookAgainOn.slice(0, 10) > today ? ` · back on ${shortDate(t.lookAgainOn.slice(0, 10))}` : ''}
      </span>
    </div>
  );
}

export default function YouScreen() {
  const [you, setYou] = useKept<YouData | null>('you:you', null);
  const [threads, setThreads] = useKept<BuddyThread[] | null>('you:threads', null);
  const [failed, setFailed] = useState(false);
  const [pane, setPane] = useKept<Pane>('you:pane', 'mind');
  const [open, setOpen] = useState<BuddyThreadDetail | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([buddyApi.you(), buddyApi.threads()]).then(
      ([y, t]) => {
        if (!alive) return;
        setYou(y);
        setThreads(t);
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [setThreads, setYou]);

  const title = you?.settings.name ?? 'Your buddy';
  const inText = you?.settings.name ?? 'your buddy';
  const mind = (threads ?? []).filter((t) => OPEN.has(t.stage));
  const memories = (you?.memories ?? []).filter((m) => m.status === 'active');
  const lasting = memories.filter((m) => m.lasting);
  const month = memories.filter((m) => !m.lasting);
  const sources = you?.sources ?? [];

  const openThread = async (id: string) => {
    try {
      setOpen(await buddyApi.thread(id));
    } catch {
      toast.error('That thread could not open. Try again.');
    }
  };
  const change = async (patch: ThreadPatch, done: string) => {
    if (!open) return;
    try {
      const next = await buddyApi.updateThread(open._id, patch);
      setOpen(next);
      setThreads((list) => (list ?? []).map((t) => (t._id === next._id ? { ...t, ...next } : t)));
      toast.success(done);
    } catch {
      toast.error('That didn’t save. Try again.');
    }
  };

  return (
    <>
      <div className="scroll">
        <header className="top">
          <div className="top-row">
            <h1 className="h1">You</h1>
            <Link href="/m/settings" className="icon-btn" aria-label="Settings">
              <SlidersHorizontal className="i" strokeWidth={1.75} aria-hidden />
            </Link>
          </div>
          <p className="sub">What {inText} knows, and what it is keeping an eye on. You decide what stays.</p>
        </header>

        {failed ? (
          <p className="meta" style={{ marginTop: 20 }}>
            This could not load. Pull down or open You again.
          </p>
        ) : !you || !threads ? (
          <div className="skeleton" aria-busy="true" style={{ marginTop: 20 }}>
            <i style={{ height: 40 }} />
            <i style={{ height: 72, marginTop: 14 }} />
            <i style={{ height: 72, marginTop: 10 }} />
          </div>
        ) : (
          <>
            <div className="seg" role="tablist" aria-label="What you see here">
              {(
                [
                  ['mind', 'On its mind', mind.length],
                  ['mem', 'Memories', memories.length],
                  ['hears', 'Hears', sources.length],
                ] as const
              ).map(([key, label, n]) => (
                <button key={key} type="button" role="tab" aria-selected={pane === key} className={pane === key ? 'is-on' : ''} onClick={() => setPane(key)}>
                  {label} <span className="n">{n}</span>
                </button>
              ))}
            </div>

            {pane === 'mind' ? (
              <div style={{ marginTop: 8 }}>
                {mind.length ? (
                  mind.map((t) => (
                    <button key={t._id} type="button" className="thread" onClick={() => void openThread(t._id)}>
                      <p className="thread-title">{t.title}</p>
                      {t.last[0]?.text ? <p className="sub" style={{ marginTop: 4 }}>{t.last[0].text}</p> : null}
                      <ThreadTags t={t} />
                    </button>
                  ))
                ) : (
                  <p className="meta" style={{ marginTop: 16 }}>
                    Nothing yet. When you tell {inText} about a plan or a habit, it shows here.
                  </p>
                )}
              </div>
            ) : null}

            {pane === 'mem' ? (
              <div>
                {(
                  [
                    ['Lasting', lasting],
                    ['This month', month],
                  ] as const
                ).map(([title, list]) =>
                  list.length ? (
                    <div key={title}>
                      <div className="sec" style={{ marginTop: 20 }}>
                        <h2>{title}</h2>
                      </div>
                      <ul>
                        {list.map((m) => (
                          <li key={m._id} className="set">
                            <div className="row-main">
                              <p className="row-title">{m.text}</p>
                              <p className="meta">
                                {m.byUser ? 'You wrote this' : `From ${SOURCE_WORDS[m.source] ?? m.source}`} · {dayWords(m.firstSeenDay)}
                                {m.sensitivity === 'private' ? ' · private' : ''}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
                {!memories.length ? (
                  <p className="meta" style={{ marginTop: 16 }}>
                    {title} remembers nothing yet.
                  </p>
                ) : null}
              </div>
            ) : null}

            {pane === 'hears' ? (
              <div>
                <p className="sub" style={{ marginTop: 18 }}>
                  Where {inText} can hear you. It knows nothing said anywhere else.
                </p>
                <ul style={{ marginTop: 8 }}>
                  {sources.map((s) => {
                    const Icon = SOURCE_ICON[s.source] ?? MessageCircle;
                    return (
                      <li key={s.source} className="set">
                        <Icon className="i" strokeWidth={1.75} style={{ marginTop: 3, color: 'var(--ink-2)' }} aria-hidden />
                        <div className="row-main">
                          <p className="row-title">{SOURCE_WORDS[s.source] ?? s.source}</p>
                          {s.silent ? (
                            <div className="tags" style={{ marginTop: 4 }}>
                              <span className="tag attention">
                                <BellOff className="i s" strokeWidth={2} aria-hidden />
                                Silent for over a week
                              </span>
                            </div>
                          ) : (
                            <p className="meta">
                              Heard {s.last ? agoWords(s.last) : 'never'} · {s.seen7} {s.seen7 === 1 ? 'message' : 'messages'} this week
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {!sources.length ? (
                  <p className="meta" style={{ marginTop: 12 }}>
                    It has not heard you anywhere yet.
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className={`sheet-layer${open ? ' is-on' : ''}`} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
        {open ? (
          <div className="sheet is-on" role="dialog" aria-label={open.title}>
            <div className="grab" />
            <div className="top-row">
              <p className="sheet-title">{open.title}</p>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(null)}>
                <X className="i" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <ThreadTags t={open} />
            <ul className="history">
              {open.history
                .slice()
                .reverse()
                .slice(0, 12)
                .map((h, i) => (
                  <li key={i}>
                    <p className="who">
                      {dayWords(h.day)}
                      {KIND_WORDS[h.kind] ? ` · ${KIND_WORDS[h.kind]}` : ''}
                      {VIA_WORDS[h.via] ? `, ${VIA_WORDS[h.via]}` : ''}
                    </p>
                    <p className="mine-said">{h.text}</p>
                  </li>
                ))}
            </ul>
            <div className="acts">
              <button type="button" className="act" onClick={() => void change({ askLess: true }, 'It will ask less about this for two weeks.')}>
                <Moon className="i" strokeWidth={1.75} aria-hidden />
                <span>
                  Ask me less<small>Quiet for two weeks</small>
                </span>
              </button>
              <button type="button" className="act" onClick={() => void change({ noAsk: !open.noAsk }, open.noAsk ? 'It may ask about this again.' : 'It won’t ask about this.')}>
                <BellOff className="i" strokeWidth={1.75} aria-hidden />
                <span>{open.noAsk ? 'It may ask about this again' : 'Don’t ask about this'}</span>
              </button>
              <button type="button" className="act" onClick={() => void change({ onScreens: !open.onScreens }, open.onScreens ? 'Kept off your screens.' : 'It may show on your screens again.')}>
                <EyeOff className="i" strokeWidth={1.75} aria-hidden />
                <span>{open.onScreens ? 'Keep it off my screens' : 'It may show on my screens'}</span>
              </button>
              <button type="button" className="act" onClick={() => void change({ stage: open.stage === 'paused' ? 'active' : 'paused' }, open.stage === 'paused' ? 'Taken up again.' : 'Paused.')}>
                <Pause className="i" strokeWidth={1.75} aria-hidden />
                <span>{open.stage === 'paused' ? 'Take it up again' : 'Pause it'}</span>
              </button>
              <button type="button" className="act danger" onClick={() => void change({ stage: 'dropped' }, 'It stopped following this.').then(() => setOpen(null))}>
                <X className="i" strokeWidth={1.75} aria-hidden />
                <span>Stop following this</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
