'use client';

/**
 * The Library tab (PHONE_APP_REDESIGN_PLAN §5, §8; step 4): search the docs by title, what is due for review today,
 * and the docs last touched. A doc opens in the web app's own doc page (made for phones in stage 6).
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Search } from 'lucide-react';
import { useDocStore } from '@/lib/store/docStore';
import { useLearningStore } from '@/lib/store/learningStore';
import { agoWords, reviewWords } from '@/components/phone/parts';

export default function LibraryScreen() {
  const docs = useDocStore((s) => s.docs);
  const loaded = useDocStore((s) => s.isInitialized);
  const plan = useLearningStore((s) => s.data?.plan ?? null);
  const [q, setQ] = useState('');

  useEffect(() => {
    void useDocStore.getState().fetchDocs();
    void useLearningStore.getState().load();
  }, []);

  const words = q.trim().toLowerCase();
  const recent = useMemo(
    () =>
      [...docs]
        .filter((d) => !words || (d.title || '').toLowerCase().includes(words))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, words ? 50 : 20),
    [docs, words],
  );
  const due = [...(plan?.planned ?? []).map((r) => ({ r, done: false })), ...(plan?.doneToday ?? []).map((r) => ({ r, done: true }))].filter(({ r }) => !words || r.title.toLowerCase().includes(words));
  const left = (plan?.planned ?? []).length;
  const minutes = (plan?.planned ?? []).reduce((s, r) => s + (r.minutes ?? 0), 0);

  return (
    <div className="scroll">
      <header className="top">
        <div className="top-row">
          <h1 className="h1">Library</h1>
        </div>
      </header>
      <label className="search">
        <Search className="i" strokeWidth={1.75} aria-hidden />
        <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your notes" aria-label="Search your notes" />
      </label>

      {due.length ? (
        <>
          <div className="sec">
            <h2>Due today</h2>
            {left ? <span className="meta">{`${left} left${minutes ? ` · ${minutes} min` : ''}`}</span> : null}
          </div>
          <ul>
            {due.map(({ r, done }) => {
              const inner = (
                <>
                  <div className="row-main">
                    <p className="row-title" style={done ? { color: 'var(--ink-3)' } : undefined}>
                      {r.title}
                    </p>
                    <p className="meta">
                      {done ? (
                        <>
                          <Check className="i s" strokeWidth={2} aria-hidden />
                          Reviewed today
                        </>
                      ) : (
                        reviewWords(r.cycleNumber)
                      )}
                    </p>
                  </div>
                  {r.docId ? <ChevronRight className="i chev" strokeWidth={1.75} aria-hidden /> : null}
                </>
              );
              return <li key={r._id}>{r.docId ? <Link href={`/docs/${r.docId}`} className="row tap">{inner}</Link> : <div className="row">{inner}</div>}</li>;
            })}
          </ul>
        </>
      ) : null}

      <div className="sec">
        <h2>{words ? 'Found' : 'Recent'}</h2>
      </div>
      {!loaded ? (
        <div className="skeleton" aria-busy="true">
          <i style={{ height: 44 }} />
          <i style={{ height: 44, marginTop: 10 }} />
        </div>
      ) : recent.length ? (
        <ul>
          {recent.map((d) => (
            <li key={d._id}>
              <Link href={`/docs/${d._id}`} className="row tap">
                <div className="row-main">
                  <p className="row-title">{d.title || 'Untitled'}</p>
                  <p className="meta">Edited {agoWords(d.updatedAt)}</p>
                </div>
                <ChevronRight className="i chev" strokeWidth={1.75} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="meta">{words ? 'Nothing by that name.' : 'No notes yet.'}</p>
      )}
    </div>
  );
}
