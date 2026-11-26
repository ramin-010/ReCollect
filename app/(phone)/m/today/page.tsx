'use client';

/**
 * Today on the phone (PHONE_APP_REDESIGN_PLAN §5, step 3), on real data: the greeting and the day's dial, the buddy's
 * open question (its quick answers) or its line for now (thumbs), Tell, the day's list with ticks (reviews, focus
 * lines, tasks due), today's reminders, and what the buddy keeps an eye on. Every part reads what the web app reads.
 */
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { Bell, BellOff, Check, ChevronRight, Mic, Pencil, SlidersHorizontal, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { useAuthStore } from '@/lib/store/authStore';
import { useLearningStore } from '@/lib/store/learningStore';
import { THUMB_REASONS, buddyApi, type BuddyThread, type BuddyToday, type ThumbReason } from '@/lib/api/buddyApi';
import { Dial, clockWords, hhmmWords, reviewWords } from '@/components/phone/parts';
import { useKept } from '@/components/phone/kept';
import { buddyName } from '@/lib/brand';
import { isKaaga } from '@/lib/brand';
import { KaagaMark } from '@/components/brand/kaaga';

interface Row {
  key: string;
  title: string;
  meta: string;
  minutes: number | null;
  done: boolean;
  toggle: () => Promise<void>;
}
interface HomeReminder {
  _id: string;
  at: string;
  text: string;
  ring: boolean;
  repeat: string | null;
  past: boolean;
  by: 'you' | 'buddy';
}

const REPEATS: Record<string, string> = { daily: 'every day', weekdays: 'on weekdays', weekly: 'every week' };
const DAYS: Record<string, string> = { mo: 'Mon', tu: 'Tue', we: 'Wed', th: 'Thu', fr: 'Fri', sa: 'Sat', su: 'Sun' };
const repeatWords = (r: string) => REPEATS[r] ?? `on ${r.split(',').map((d) => DAYS[d] ?? d).join(', ')}`;
const dayOfLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function TodayScreen() {
  const user = useAuthStore((s) => s.user);
  const data = useLearningStore((s) => s.data);
  const status = useLearningStore((s) => s.status);
  const [buddy, setBuddy] = useKept<BuddyToday | null>('today:buddy', null);
  // The answer and the thumb are kept with the question or line they belong to (a return visit shows them at once).
  const [answered, setAnswered] = useKept<{ id: string; label: string } | null>('today:answered', null);
  const [thumbKept, setThumb] = useKept<{ key: string; verdict: 'more' | 'less' } | null>('today:thumb', null);
  // Stage 5b: why a "not this", once per line.
  const [whyKept, setWhy] = useKept<{ key: string; said: string } | null>('today:why', null);
  const [reminders, setReminders] = useKept<HomeReminder[]>('today:reminders', []);
  const [threads, setThreads] = useKept<BuddyThread[]>('today:threads', []);

  useEffect(() => {
    let alive = true;
    void useLearningStore.getState().load();
    buddyApi.today().then((d) => alive && setBuddy(d), () => undefined);
    axiosInstance.get('/api/reminders/today').then((r) => alive && setReminders(r.data.data?.items ?? []), () => undefined);
    buddyApi.threads().then((t) => alive && setThreads(t), () => undefined);
    return () => {
      alive = false;
    };
  }, [setBuddy, setReminders, setThreads]);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const s = useLearningStore.getState();
    const today = data.today;
    const open: Row[] = [];
    const done: Row[] = [];
    for (const r of data.plan?.planned ?? []) open.push({ key: `r${r._id}`, title: r.title, meta: reviewWords(r.cycleNumber), minutes: r.minutes ?? null, done: false, toggle: () => s.completeRevision(r._id) });
    for (const r of data.plan?.doneToday ?? []) done.push({ key: `r${r._id}`, title: r.title, meta: reviewWords(r.cycleNumber), minutes: r.minutes ?? null, done: true, toggle: () => s.uncompleteRevision(r._id) });
    for (const f of data.focus?.items ?? []) (f.done ? done : open).push({ key: `f${f._id}`, title: f.text, meta: 'Focus', minutes: null, done: f.done, toggle: () => s.toggleFocus(f._id) });
    for (const t of data.tasks ?? []) {
      const finished = t.status === 'complete';
      if (finished ? !t.completedAt || dayOfLocal(new Date(t.completedAt)) !== today : !t.dueDate || dayOfLocal(new Date(t.dueDate)) > today) continue;
      const late = !finished && t.dueDate ? Math.round((Date.parse(`${today}T12:00:00`) - Date.parse(`${dayOfLocal(new Date(t.dueDate))}T12:00:00`)) / 86_400_000) : 0;
      const meta = finished ? 'Task' : late > 0 ? `Task · ${late} ${late === 1 ? 'day' : 'days'} late` : 'Task · due today';
      (finished ? done : open).push({ key: `t${t._id}`, title: t.title, meta, minutes: null, done: finished, toggle: () => s.toggleTask(t._id) });
    }
    return [...open, ...done];
  }, [data]);

  const left = rows.filter((r) => !r.done);
  const minutes = left.reduce((sum, r) => sum + (r.minutes ?? 0), 0);
  // Its own name, or "Your buddy" heading a card and "your buddy" inside a sentence.
  const title = buddyName(buddy?.name);
  const inText = buddyName(buddy?.name);
  const mark = buddyName(buddy?.name).charAt(0).toUpperCase();
  const ask = buddy?.enabled && !buddy.paused ? buddy.asks?.[0] : undefined;
  const line = buddy?.enabled && !buddy.paused && !ask && buddy.line && !buddy.line.fallback ? buddy.line : null;
  const lineKey = line ? `${line.dayId}:${line.key ?? line.slot}` : null;
  const thumb = thumbKept && thumbKept.key === lineKey ? thumbKept.verdict : null;
  const keeping = threads.filter((t) => (t.stage === 'active' || t.stage === 'committed') && t.onScreens && !t.sensitive).slice(0, 2);

  const now = new Date();
  const hour = now.getHours();
  const hello = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = user?.name?.trim().split(/\s+/)[0];

  const answer = async (id: string, choice: number, label: string) => {
    setAnswered({ id, label });
    try {
      await buddyApi.answerAsk(id, { choice });
    } catch {
      setAnswered(null);
      toast.error('That didn’t save. Try again.');
    }
  };
  const sendThumb = async (verdict: 'more' | 'less') => {
    if (!line || !lineKey) return;
    setThumb({ key: lineKey, verdict });
    try {
      await buddyApi.feedback({ buddyDayId: line.dayId, target: line.key ?? line.slot, verdict });
    } catch {
      setThumb(null);
      toast.error('That didn’t save. Try again.');
    }
  };
  const sendWhy = async (reason: ThumbReason) => {
    if (!line || !lineKey) return;
    try {
      const r = await buddyApi.feedback({ buddyDayId: line.dayId, target: line.key ?? line.slot, verdict: 'less', reason });
      setWhy({ key: lineKey, said: reason === 'private' && r.offScreens ? 'Got it. That stays off your screens now.' : 'Got it, thanks.' });
    } catch {
      toast.error('That didn’t save. Try again.');
    }
  };
  const tick = async (row: Row) => {
    try {
      await row.toggle();
    } catch {
      toast.error('That didn’t save. Try again.');
    }
  };

  return (
    <div className="scroll">
      <header className="top">
        <div className="top-row">
          <p className="hello">
            {hello}
            {first ? `, ${first}` : ''}
          </p>
          <Link href="/m/settings" className="icon-btn" aria-label="Settings">
            <SlidersHorizontal className="i" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
        <h1 className="h1">{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}</h1>
        {data && rows.length ? (
          <div className="day">
            <Dial total={rows.length} done={rows.length - left.length} label={`${rows.length - left.length} of ${rows.length} done today`} />
            <p className="sub">{left.length === 0 ? `All ${rows.length} done. Nothing left today.` : `${left.length} left of ${rows.length}${minutes ? ` · about ${minutes} minutes` : ''}`}</p>
          </div>
        ) : null}
      </header>

      {ask ? (
        <article className="buddy">
          <div className="buddy-head">
            <span className="mark" aria-hidden>
              {isKaaga(buddy?.name) ? <KaagaMark size={16} state={ask ? 'call' : 'still'} once /> : mark}
            </span>
            <span>
              <b>{title}</b> is asking
            </span>
            <span className="until">until {clockWords(ask.until)}</span>
          </div>
          <p className="voice-xl">{ask.text}</p>
          {answered?.id === ask._id ? (
            <div className="answered-row">
              <p className="voice-s" style={{ color: 'var(--ink-1)' }}>
                {answered.label}. Noted, tell me more whenever you like.
              </p>
            </div>
          ) : (
            <div className="answers">
              {ask.answers.map((a, i) => (
                <button key={a.label} type="button" className={`btn ${i === 0 ? 'main' : 'out'}`} onClick={() => void answer(ask._id, i, a.label)}>
                  {a.label}
                </button>
              ))}
              <Link href="/m/buddy" className="icon-btn ringed" aria-label="Reply in your own words">
                <Pencil className="i" strokeWidth={1.75} aria-hidden />
              </Link>
            </div>
          )}
        </article>
      ) : line ? (
        <article className="buddy">
          <div className="buddy-head">
            <span className="mark" aria-hidden>
              {isKaaga(buddy?.name) ? <KaagaMark size={16} state={ask ? 'call' : 'still'} once /> : mark}
            </span>
            <span>
              <b>{title}</b>
            </span>
            {line.until ? <span className="until">until {line.until.includes('T') ? clockWords(line.until) : hhmmWords(line.until)}</span> : null}
          </div>
          <p className="voice-xl">{line.text}</p>
          <div className="buddy-foot">
            <span>For this part of your day</span>
            <span className="thumbs">
              <button type="button" className={`icon-btn${thumb === 'more' ? ' is-on' : ''}`} aria-label="More like this" aria-pressed={thumb === 'more'} onClick={() => void sendThumb('more')}>
                <ThumbsUp className="i" strokeWidth={1.75} aria-hidden />
              </button>
              <button type="button" className={`icon-btn${thumb === 'less' ? ' is-on' : ''}`} aria-label="Less like this" aria-pressed={thumb === 'less'} onClick={() => void sendThumb('less')}>
                <ThumbsDown className="i" strokeWidth={1.75} aria-hidden />
              </button>
            </span>
          </div>
          {thumb === 'less' ? (
            whyKept?.key === lineKey ? (
              <p className="voice-s">{whyKept.said}</p>
            ) : (
              <div className="answers" role="group" aria-label="What was off?">
                {THUMB_REASONS.map((r) => (
                  <button key={r.reason} type="button" className="btn out" onClick={() => void sendWhy(r.reason)}>
                    {r.label}
                  </button>
                ))}
              </div>
            )
          ) : null}
        </article>
      ) : null}

      {buddy?.enabled ? (
        <Link href="/m/buddy?tell=1" className="tell">
          <span>Tell {inText} something</span>
          <span className="ic">
            <Mic className="i" strokeWidth={1.75} aria-hidden />
          </span>
        </Link>
      ) : null}

      {status === 'error' && !data ? (
        <div className="sec">
          <p className="meta">Today could not load.</p>
          <button type="button" className="link" onClick={() => void useLearningStore.getState().refresh()}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="skeleton" aria-busy="true" style={{ marginTop: 24 }}>
          <i style={{ height: 18, width: '40%' }} />
          <i style={{ height: 48, marginTop: 14 }} />
          <i style={{ height: 48, marginTop: 10 }} />
        </div>
      ) : (
        <>
          <div className="sec">
            <h2>Today</h2>
            {rows.length ? <span className="meta">{`${rows.length - left.length} of ${rows.length} done`}</span> : null}
          </div>
          {rows.length ? (
            <ul id="todo">
              {rows.map((r) => (
                <li key={r.key} className={`row${r.done ? ' is-done' : ''}`}>
                  <button type="button" className="check" aria-label={r.done ? 'Mark not done' : 'Mark done'} onClick={() => void tick(r)}>
                    <i>
                      <Check className="i" strokeWidth={2} aria-hidden />
                    </i>
                  </button>
                  <div className="row-main">
                    <p className="row-title">{r.title}</p>
                    <p className="meta">{r.meta}</p>
                  </div>
                  {r.minutes ? <span className="side">{r.minutes} min</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="meta">Nothing planned for today.</p>
          )}
        </>
      )}

      {reminders.length ? (
        <>
          <div className="sec">
            <h2>Reminders</h2>
          </div>
          <ul>
            {reminders.map((r) => (
              <li key={r._id} className={`row${r.past ? ' is-past' : ''}`}>
                <span className="at">{clockWords(r.at)}</span>
                <div className="row-main">
                  <p className="row-title">{r.text}</p>
                  <p className="meta">
                    {r.ring ? <Bell className="i s" strokeWidth={1.75} aria-hidden /> : <BellOff className="i s" strokeWidth={1.75} aria-hidden />}
                    {r.ring ? (r.past ? 'Rang' : 'Rings') : 'Silent'} · {r.by === 'buddy' ? `set by ${inText}` : 'set by you'}
                    {r.repeat ? ` · ${repeatWords(r.repeat)}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {keeping.length ? (
        <>
          <div className="sec">
            <h2>{title} is keeping an eye on</h2>
            <Link href="/m/you" className="link">
              See all
            </Link>
          </div>
          <ul>
            {keeping.map((t) => (
              <li key={t._id}>
                <Link href="/m/you" className="row tap">
                  <div className="row-main">
                    <p className="row-title">{t.title}</p>
                    {t.last[0]?.text ? <p className="meta">{t.last[0].text}</p> : null}
                  </div>
                  <ChevronRight className="i chev" strokeWidth={1.75} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
