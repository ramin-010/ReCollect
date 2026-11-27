'use client';

/**
 * Settings › Your data, the part a friend reads before they trust Kaaga (TRUST_PLAN T3, T4): what it keeps, by kind and
 * count; who can see it (you, the people you share with, the agents you connected, the owner of the server); and what
 * the app showed the owner of this account, as dated rows. Plain sentences, no badges (T7). Read live.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { accountApi, type AccountSummary, type KeepKind, type OwnerAccessRow } from '@/lib/api/accountApi';

const KEEP_WORDS: Record<KeepKind, [string, string]> = {
  docs: ['doc', 'docs'],
  notes: ['note or link on your lessons', 'notes and links on your lessons'],
  pocket: ['pocket note', 'pocket notes'],
  tasks: ['task', 'tasks'],
  reminders: ['reminder', 'reminders'],
  goals: ['goal', 'goals'],
  subjects: ['subject', 'subjects'],
  memories: ['thing Kaaga remembers about you', 'things Kaaga remembers about you'],
  conversations: ['conversation with Ask Kaaga', 'conversations with Ask Kaaga'],
  sessions: ['study or work session', 'study and work sessions'],
  files: ['file you uploaded', 'files you uploaded'],
};

const count = (n: number) => new Intl.NumberFormat('en-GB').format(n);
const DAY_TIME = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const usd = (n: number) => `$${n.toFixed(2)}`;

function agoWords(iso: string | null): string {
  if (!iso) return 'never used';
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return days <= 0 ? 'used today' : days === 1 ? 'used yesterday' : days < 60 ? `used ${days} days ago` : `last used ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))}`;
}

/** "a, b, and c". */
const listWords = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')}${items.length > 2 ? ',' : ''} and ${items[items.length - 1]}`);

/** One row of the log, in words. */
export function accessWords(row: OwnerAccessRow): string {
  const d = row.details ?? {};
  switch (row.kind) {
    case 'viewed':
      return `The owner opened the People page, which showed ${d.shown?.length ? listWords(d.shown) : 'your name, email and use'}`;
    case 'topped_up':
      return `The owner gave you ${typeof d.usd === 'number' ? usd(d.usd) : 'more'} of free AI`;
    case 'limit_set':
      return typeof d.limitUsd === 'number' ? `The owner set your free AI to at most ${usd(d.limitUsd)} a day` : 'The owner took away your daily limit on free AI';
    case 'access_ended':
      return 'The owner ended your access';
    case 'access_restored':
      return 'The owner gave your access back';
  }
}

export function DataTrust() {
  const [summary, setSummary] = useState<AccountSummary | null | 'failed'>(null);
  const [log, setLog] = useState<OwnerAccessRow[] | null | 'failed'>(null);

  useEffect(() => {
    let alive = true;
    accountApi.summary().then(
      (s) => alive && setSummary(s),
      () => alive && setSummary('failed'),
    );
    accountApi.ownerAccess().then(
      (r) => alive && setLog(r.rows),
      () => alive && setLog('failed'),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (summary === 'failed') return <p className="rc-meta mb-9">What Kaaga keeps couldn’t be read just now. The download below still has all of it.</p>;
  if (summary === null) {
    return (
      <div className="data-trust mb-9" aria-busy="true">
        <div className="data-skel" style={{ width: '40%' }} />
        <div className="data-skel" style={{ width: '88%' }} />
        <div className="data-skel" style={{ width: '72%' }} />
      </div>
    );
  }
  const keeps = summary.keeps.filter((k) => k.count > 0);
  const { shares, agents } = summary;
  return (
    <div className="data-trust mb-9">
      <section aria-labelledby="data-keeps">
        <h2 id="data-keeps" className="text-[15px] font-[600] text-[var(--rc-ink-1)]">
          What Kaaga keeps
        </h2>
        {keeps.length ? (
          <ul className="data-keeps">
            {keeps.map((k) => (
              <li key={k.kind}>
                <span className="data-count">{count(k.count)}</span> {KEEP_WORDS[k.kind][k.count === 1 ? 0 : 1]}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rc-meta mt-1">Nothing yet.</p>
        )}
        <p className="rc-meta mt-2">All of it lives in this server’s database, except the files, which are kept with Cloudinary. None of it is end-to-end encrypted: the server reads it so search, reviews and reminders work.</p>
      </section>

      <section aria-labelledby="data-who" className="mt-8">
        <h2 id="data-who" className="text-[15px] font-[600] text-[var(--rc-ink-1)]">
          Who can see it
        </h2>
        <dl className="data-who">
          <dt>You</dt>
          <dd>Everything above.</dd>

          <dt>People you share with</dt>
          <dd>
            {shares.shared === 0 && shares.published === 0 ? (
              'Nobody: you haven’t shared or published a doc.'
            ) : (
              <>
                {[shares.shared ? `${count(shares.shared)} ${shares.shared === 1 ? 'doc' : 'docs'} shared with ${count(shares.people)} ${shares.people === 1 ? 'person' : 'people'}` : null, shares.published ? `${count(shares.published)} published (anyone with the link can read ${shares.published === 1 ? 'it' : 'them'})` : null]
                  .filter(Boolean)
                  .join(' · ')}
                {shares.docs.length ? (
                  <span className="data-docs">
                    {shares.docs.map((d, i) => (
                      <span key={d.id}>
                        {i ? ', ' : ''}
                        <Link href={`/docs/${d.id}`}>{d.title.trim() || 'Untitled'}</Link>
                      </span>
                    ))}
                  </span>
                ) : null}
              </>
            )}
          </dd>

          <dt>Agents you connected</dt>
          <dd>
            {agents.length === 0 ? (
              'None.'
            ) : (
              <>
                {agents.map((a, i) => (
                  <span key={a.id}>
                    {i ? ' · ' : ''}
                    {a.name} <span className="data-quiet">({agoWords(a.lastUsedAt)})</span>
                  </span>
                ))}
                . They can read and change what Settings › Agents says; end any of them there.
              </>
            )}
          </dd>

          <dt>The owner of this server</dt>
          <dd>
            {summary.isOwner ? (
              'That’s you.'
            ) : (
              <>
                In the app, only your name, email, when you joined and were last active, the AI you used and its cost, the apps you connected, and what you sent them. Never your docs, notes, chats or memories.
                <OwnerLog log={log} />
              </>
            )}
          </dd>
        </dl>
      </section>
    </div>
  );
}

function OwnerLog({ log }: { log: OwnerAccessRow[] | null | 'failed' }) {
  return (
    <div className="data-log">
      <p className="data-log-title">What the app showed the owner, and what they did</p>
      {log === 'failed' ? (
        <p className="rc-meta">The list couldn’t be read just now.</p>
      ) : log === null ? (
        <div className="data-skel" style={{ width: '60%' }} />
      ) : log.length === 0 ? (
        <p className="rc-meta">Nothing yet.</p>
      ) : (
        <ul>
          {log.map((row, i) => (
            <li key={`${row.at}-${i}`}>
              <time dateTime={row.at}>{DAY_TIME.format(new Date(row.at))}</time>
              <span>{accessWords(row)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="rc-meta mt-2">This lists what the app showed them. Like anyone who runs a server, they could also reach the database directly; that isn’t listed here.</p>
    </div>
  );
}
