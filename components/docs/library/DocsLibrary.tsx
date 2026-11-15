'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDownUp, FileText, Globe, Link2, MoreHorizontal, Pin, PinOff, Plus, RotateCcw, Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcConfirm, RcIconButton, RcMenu, RcSegmented, RcSkel } from '@/components/rc-ui';
import { RcPicker } from '@/components/rc-ui/RcPicker';
import { docApi, type DocSearchHit } from '@/lib/api/docApi';
import { learningApi } from '@/lib/api/learningApi';
import { useDocStore, type Doc } from '@/lib/store/docStore';
import type { Subject, SubjectWithTopics, TopicStatus } from '@/lib/learning/types';
import { formatRelative } from '@/components/docs/page/format';
import { NewDocDialog } from './NewDocDialog';
import { StatusCell } from './StatusCell';
import { SubjectPathView } from './SubjectPath';
import './docs-library.css';

type View = 'all' | 'due' | 'pinned' | 'shared' | 'path' | 'trash';
type Sort = 'edited' | 'created' | 'title';
const UNFILED = '__unfiled';

interface Row {
  doc: Doc;
  subject: Subject | null;
  status: TopicStatus | null;
}

/** A doc the text search found: its place in the ranking and the snippet. */
interface TextHit {
  order: number;
  snippet: string;
  marks: DocSearchHit['marks'];
}

/** Shorter queries match titles only (every doc has a word starting with "ca"). */
const TEXT_SEARCH_MIN = 3;
const TEXT_SEARCH_DELAY_MS = 180;

const SORTS: { value: Sort; label: string }[] = [
  { value: 'edited', label: 'Last edited' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title' },
];

/** /docs: find a doc fast, see what's due, start a new one from a template. */
export function DocsLibrary() {
  const router = useRouter();
  const params = useSearchParams();
  const { docs, isInitialized, setDocs, updateDoc, removeDoc } = useDocStore();
  const [subjects, setSubjects] = useState<SubjectWithTopics[]>([]);
  const [statuses, setStatuses] = useState<TopicStatus[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // ?subject=<id> opens that subject's path (Home's Next up links here).
  const [view, setView] = useState<View>(() => (params.get('subject') ? 'path' : 'all'));
  const [subjectFilter, setSubjectFilter] = useState<string | null>(() => params.get('subject'));
  const [query, setQuery] = useState('');
  // Titles filter at once (below); the text search answers a moment later, for the query it was asked.
  const [textHits, setTextHits] = useState<{ q: string; byId: Map<string, TextHit> } | null>(null);
  const [sort, setSort] = useState<Sort>('edited');
  const [newOpen, setNewOpen] = useState(false);
  // "Delete forever" (from the Trash view) and "Empty trash" ask first; moving to the trash doesn't.
  const [toDelete, setToDelete] = useState<Doc | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Old deep links (/docs?id=…) open the doc page.
  useEffect(() => {
    const id = params.get('id');
    if (id) router.replace(`/docs/${encodeURIComponent(id)}`);
  }, [params, router]);

  // Back and forward between subjects: the URL leads.
  const urlSubject = params.get('subject');
  useEffect(() => {
    // "Not filed" has no URL of its own: it survives a URL without a subject.
    setSubjectFilter((cur) => (urlSubject ? urlSubject : cur === UNFILED ? cur : null));
    if (urlSubject) setView('path');
  }, [urlSubject]);

  /** A subject chosen in the rail opens its path; "All docs" goes back to the list. */
  const chooseSubject = (id: string | null) => {
    setSubjectFilter(id);
    setView((v) => (id && id !== UNFILED ? 'path' : v === 'path' ? 'all' : v));
    const next = id && id !== UNFILED ? `/docs?subject=${encodeURIComponent(id)}` : '/docs';
    if (next !== `/docs${urlSubject ? `?subject=${encodeURIComponent(urlSubject)}` : ''}`) router.replace(next, { scroll: false });
  };

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const [d, s, st] = await Promise.all([
        docApi.fetchAllDocs(),
        learningApi.getSubjects().catch(() => [] as SubjectWithTopics[]),
        learningApi.getTopicStatuses().catch(() => [] as TopicStatus[]),
      ]);
      setDocs(d.map((x) => x as unknown as Doc));
      setSubjects(s);
      setStatuses(st);
    } catch {
      setLoadFailed(true);
    }
  }, [setDocs]);

  useEffect(() => {
    void load();
  }, [load]);

  const searchText = query.trim();
  useEffect(() => {
    if (searchText.length < TEXT_SEARCH_MIN) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      docApi
        .searchDocs(searchText, { signal: ctrl.signal })
        .then((hits) => setTextHits({ q: searchText, byId: new Map(hits.map((h, i) => [h._id, { order: i, snippet: h.snippet, marks: h.marks }])) }))
        // Titles still filter; only the text matches are missing.
        .catch((err) => !ctrl.signal.aborted && console.warn('[docs] text search failed', err));
    }, TEXT_SEARCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [searchText]);

  const rows: Row[] = useMemo(() => {
    const byDoc = new Map<string, TopicStatus>();
    for (const s of statuses ?? []) if (s.docId) byDoc.set(s.docId, s);
    const subjectById = new Map(subjects.map((s) => [s._id, s]));
    return docs
      .filter((d) => !d.isArchived && !d.trashedAt && !d._id.startsWith('local_'))
      .map((doc) => {
        const status = byDoc.get(doc._id) ?? null;
        return { doc, status, subject: status ? subjectById.get(status.subjectId) ?? null : null };
      });
  }, [docs, statuses, subjects]);

  const isDue = (r: Row) => r.status?.state === 'due';
  const isShared = (r: Row) => (r.doc.role ?? 'owner') !== 'owner' || !!r.doc.publishedAt || (r.doc.collaborators?.length ?? 0) > 0;
  // The trash: his own docs only (a shared doc is left, not trashed), last moved first.
  const trashRows: Row[] = useMemo(
    () =>
      docs
        .filter((d) => !!d.trashedAt && (d.role ?? 'owner') === 'owner' && !d._id.startsWith('local_'))
        .sort((a, b) => new Date(b.trashedAt!).getTime() - new Date(a.trashedAt!).getTime())
        .map((doc) => ({ doc, status: null, subject: null })),
    [docs],
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      due: rows.filter(isDue).length,
      pinned: rows.filter((r) => r.doc.isPinned).length,
      shared: rows.filter(isShared).length,
      trash: trashRows.length,
    }),
    [rows, trashRows],
  );

  const subjectCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = r.subject?._id ?? UNFILED;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  // The text search's answer, while it is for what the box says now.
  const hitsNow = textHits && searchText.length >= TEXT_SEARCH_MIN && textHits.q === searchText ? textHits.byId : null;

  const visible = useMemo(() => {
    const q = searchText.toLowerCase();
    const list = rows.filter((r) => {
      if (view === 'due' && !isDue(r)) return false;
      if (view === 'pinned' && !r.doc.isPinned) return false;
      if (view === 'shared' && !isShared(r)) return false;
      if (subjectFilter === UNFILED && r.subject) return false;
      if (subjectFilter && subjectFilter !== UNFILED && r.subject?._id !== subjectFilter) return false;
      if (q && !hitsNow?.has(r.doc._id) && !(r.doc.title || 'untitled').toLowerCase().includes(q) && !r.subject?.name.toLowerCase().includes(q)) return false;
      return true;
    });
    const time = (s?: string) => (s ? new Date(s).getTime() : 0);
    list.sort((a, b) => {
      // Searching: the best match first (a subject's name match after the text search's).
      if (hitsNow) {
        const x = hitsNow.get(a.doc._id)?.order ?? Infinity;
        const y = hitsNow.get(b.doc._id)?.order ?? Infinity;
        if (x !== y) return x - y;
      }
      if (a.doc.isPinned !== b.doc.isPinned && view !== 'pinned') return a.doc.isPinned ? -1 : 1;
      if (sort === 'title') return (a.doc.title || 'Untitled').localeCompare(b.doc.title || 'Untitled');
      if (sort === 'created') return time(b.doc.createdAt) - time(a.doc.createdAt);
      return time(b.doc.updatedAt) - time(a.doc.updatedAt);
    });
    return list;
  }, [rows, view, subjectFilter, searchText, hitsNow, sort]);

  const togglePin = async (doc: Doc) => {
    updateDoc(doc._id, { isPinned: !doc.isPinned });
    try {
      await docApi.setPinned(doc._id, !doc.isPinned);
    } catch {
      updateDoc(doc._id, { isPinned: doc.isPinned });
      toast.error('That did not save. Try again.');
    }
  };

  const copyLink = async (doc: Doc) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/docs/${doc._id}`);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await docApi.deleteDoc(toDelete._id);
      removeDoc(toDelete._id);
      toast.success('Deleted for good');
      setToDelete(null);
    } catch {
      toast.error('The doc was not deleted. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  const restore = async (doc: Doc) => {
    updateDoc(doc._id, { trashedAt: null });
    try {
      await docApi.restoreDoc(doc._id);
    } catch {
      updateDoc(doc._id, { trashedAt: doc.trashedAt ?? null });
      toast.error('It did not come back. Try again.');
    }
  };

  const moveToTrash = async (doc: Doc) => {
    const at = new Date().toISOString();
    updateDoc(doc._id, { trashedAt: at });
    try {
      await docApi.trashDoc(doc._id);
      toast.success(`Moved “${doc.title || 'Untitled'}” to the trash`, { action: { label: 'Undo', onClick: () => void restore({ ...doc, trashedAt: at }) } });
    } catch {
      updateDoc(doc._id, { trashedAt: null });
      toast.error('It did not move. Try again.');
    }
  };

  const confirmEmpty = async () => {
    setDeleting(true);
    try {
      const { deleted } = await docApi.emptyTrash();
      for (const r of trashRows) removeDoc(r.doc._id);
      toast.success(`Deleted ${deleted} ${deleted === 1 ? 'doc' : 'docs'} for good`);
      setEmptyOpen(false);
      setView('all');
    } catch {
      toast.error('The trash was not emptied. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  const loading = !isInitialized && !loadFailed;
  const summary = [
    `${counts.all} ${counts.all === 1 ? 'doc' : 'docs'}`,
    counts.due ? `${counts.due} to revise today` : null,
    counts.pinned ? `${counts.pinned} pinned` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const pathSubject = subjectFilter && subjectFilter !== UNFILED ? subjects.find((s) => s._id === subjectFilter) ?? null : null;
  const showPath = view === 'path' && !!pathSubject;
  const views = [
    ...(pathSubject ? [{ value: 'path' as View, label: 'Path' }] : []),
    { value: 'all' as View, label: 'All', count: counts.all },
    { value: 'due' as View, label: 'Due', count: counts.due },
    { value: 'pinned' as View, label: 'Pinned', count: counts.pinned },
    ...(counts.shared ? [{ value: 'shared' as View, label: 'Shared', count: counts.shared }] : []),
    ...(counts.trash ? [{ value: 'trash' as View, label: 'Trash', count: counts.trash }] : []),
  ];

  return (
    <div className={cn(rcScope, 'lib-page')}>
      <div className="lib-frame">
        <header className="lib-head">
          <div className="min-w-0">
            <h1 className="rc-h1">Docs</h1>
            <p className="rc-body rc-ink-2 mt-1">{loading ? ' ' : summary}</p>
          </div>
          <RcButton variant="main" icon={<Plus className="h-4 w-4" strokeWidth={2} />} onClick={() => setNewOpen(true)}>
            New doc
          </RcButton>
        </header>

        <div className="lib-bar">
          <RcSegmented label="Show" options={views} value={view === 'path' && !pathSubject ? 'all' : view} onChange={setView} />
          {/* A path has its own order: no search or sort there. */}
          {view === 'trash' && counts.trash > 0 && (
            <div className="lib-bar-right">
              <RcButton variant="danger" icon={<Trash2 className="h-4 w-4" strokeWidth={1.75} />} onClick={() => setEmptyOpen(true)}>
                Empty trash
              </RcButton>
            </div>
          )}
          {!showPath && view !== 'trash' && (
            <div className="lib-bar-right">
              <label className="lib-search">
                <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search docs" aria-label="Search docs" />
              </label>
              <RcPicker label="Sort" options={SORTS} value={sort} onChange={(v) => setSort(v as Sort)} searchable={false} width={180} align="end">
                <button type="button" className="rc-btn rc-btn--outline lib-sort">
                  <ArrowDownUp className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  {SORTS.find((s) => s.value === sort)!.label}
                </button>
              </RcPicker>
            </div>
          )}
        </div>

        <div className="lib-body">
          <nav className="lib-rail" aria-label="Subjects">
            <div className="lib-rail-label">Subjects</div>
            <button type="button" className="lib-rail-item" aria-current={subjectFilter === null || undefined} onClick={() => chooseSubject(null)}>
              <span className="min-w-0 flex-1 text-left">All docs</span>
              <span className="lib-count">{counts.all}</span>
            </button>
            {subjects.map((s) => (
              <button
                key={s._id}
                type="button"
                className="lib-rail-item"
                aria-current={subjectFilter === s._id || undefined}
                onClick={() => chooseSubject(subjectFilter === s._id ? null : s._id)}
              >
                <span className="rc-swatch" style={{ background: s.color ?? 'var(--rc-icon)' }} aria-hidden />
                <span className="min-w-0 flex-1 text-left">{s.name}</span>
                <span className="lib-count">{subjectCounts.get(s._id) ?? 0}</span>
              </button>
            ))}
            {(subjectCounts.get(UNFILED) ?? 0) > 0 && (
              <button type="button" className="lib-rail-item" aria-current={subjectFilter === UNFILED || undefined} onClick={() => chooseSubject(subjectFilter === UNFILED ? null : UNFILED)}>
                <span className="min-w-0 flex-1 text-left">Not filed</span>
                <span className="lib-count">{subjectCounts.get(UNFILED)}</span>
              </button>
            )}
          </nav>

          <section className="lib-list" aria-label="Docs" aria-busy={loading || undefined} data-subject={subjectFilter ? 'hidden' : undefined}>
            {showPath ? (
              <SubjectPathView key={pathSubject!._id} subjectId={pathSubject!._id} subjectName={pathSubject!.name} statuses={statuses} />
            ) : loadFailed ? (
              <div className="lib-empty">
                <p className="rc-title">Docs could not load</p>
                <p className="rc-body rc-ink-2 mt-1">Check that you are online, then try again.</p>
                <RcButton className="mt-4" variant="outline" onClick={() => void load()}>
                  Try again
                </RcButton>
              </div>
            ) : loading ? (
              <ul>
                {Array.from({ length: 8 }, (_, i) => (
                  <li key={i} className="lib-row lib-row--skel">
                    <RcSkel className="h-[18px] w-[18px]" />
                    <RcSkel className="h-4" style={{ width: `${30 + ((i * 17) % 40)}%` }} />
                  </li>
                ))}
              </ul>
            ) : view === 'trash' ? (
              <TrashList rows={trashRows} onRestore={(d) => void restore(d)} onDelete={setToDelete} />
            ) : rows.length === 0 ? (
              <div className="lib-empty">
                <p className="rc-title">No docs yet</p>
                <p className="rc-body rc-ink-2 mt-1">Start from a template: a DSA problem, a concept, a system design or notes.</p>
                <RcButton className="mt-4" variant="main" icon={<Plus className="h-4 w-4" strokeWidth={2} />} onClick={() => setNewOpen(true)}>
                  New doc
                </RcButton>
              </div>
            ) : visible.length === 0 ? (
              <div className="lib-empty">
                <p className="rc-body rc-ink-2">
                  {query.trim() ? `No docs match “${query.trim()}”.` : view === 'due' ? 'Nothing to revise today.' : view === 'pinned' ? 'No pinned docs. Pin one from its menu.' : 'No docs here yet.'}
                </p>
                {(query || view !== 'all' || subjectFilter) && (
                  <RcButton
                    className="mt-3"
                    size="sm"
                    variant="quiet"
                    onClick={() => {
                      setQuery('');
                      setView('all');
                      chooseSubject(null);
                    }}
                  >
                    Show all docs
                  </RcButton>
                )}
              </div>
            ) : (
              <ul>
                {visible.map((r) => (
                  <DocRow
                    key={r.doc._id}
                    row={r}
                    hit={hitsNow?.get(r.doc._id)}
                    showSubject={!subjectFilter}
                    onPin={() => void togglePin(r.doc)}
                    onCopy={() => void copyLink(r.doc)}
                    onDelete={() => void moveToTrash(r.doc)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <NewDocDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        subjects={subjects}
        defaultSubjectId={subjectFilter && subjectFilter !== UNFILED ? subjectFilter : null}
        onSubjectCreated={(s) => setSubjects((cur) => [...cur, { ...s, topics: [] }])}
      />
      <RcConfirm
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete “${toDelete?.title || 'Untitled'}” for good?`}
        body="It can't be brought back. It leaves Docs for everyone it is shared with; its revision history stays."
        confirmLabel="Delete for good"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
      />
      <RcConfirm
        open={emptyOpen}
        onOpenChange={setEmptyOpen}
        title={`Empty the trash?`}
        body={`${counts.trash} ${counts.trash === 1 ? 'doc' : 'docs'} will be deleted for good. This can't be undone.`}
        confirmLabel="Empty trash"
        danger
        busy={deleting}
        onConfirm={() => void confirmEmpty()}
      />
    </div>
  );
}

const TRASH_DAYS = 30;

/** The Trash view: when each doc goes for good, with Restore and Delete for good on every row. */
function TrashList({ rows, onRestore, onDelete }: { rows: Row[]; onRestore: (d: Doc) => void; onDelete: (d: Doc) => void }) {
  return (
    <>
      <p className="rc-meta lib-trash-note">Docs in the trash are deleted for good {TRASH_DAYS} days after they were moved here.</p>
      <ul>
        {rows.map(({ doc }) => {
          const gone = new Date(new Date(doc.trashedAt!).getTime() + TRASH_DAYS * 86_400_000);
          return (
            <li key={doc._id} className="lib-row rc-row lib-row--trash">
              <Link href={`/docs/${doc._id}`} className="lib-row-link">
                <FileText className="lib-row-icon" strokeWidth={1.75} aria-hidden />
                <span className="lib-row-title">
                  <span className={cn(!doc.title && 'rc-ink-3')}>{doc.title || 'Untitled'}</span>
                </span>
                <span className="lib-edited" title={gone.toLocaleString()}>
                  Moved {formatRelative(doc.trashedAt!)} · goes {gone.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </Link>
              <span className="lib-trash-actions">
                <RcButton size="sm" variant="quiet" icon={<RotateCcw className="h-4 w-4" strokeWidth={1.75} />} onClick={() => onRestore(doc)}>
                  Restore
                </RcButton>
                <RcIconButton label={`Delete “${doc.title || 'Untitled'}” for good`} size="sm" onClick={() => onDelete(doc)}>
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </RcIconButton>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** The snippet with its matched words marked (the words in ink 1, the rest in ink 2). */
function MarkedSnippet({ text, marks }: { text: string; marks: TextHit['marks'] }) {
  const parts: ReactNode[] = [];
  let at = 0;
  marks.forEach(([start, end], i) => {
    if (start < at) return;
    if (start > at) parts.push(text.slice(at, start));
    parts.push(<mark key={i}>{text.slice(start, end)}</mark>);
    at = end;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}

/** How a doc is shared, as a quiet icon after its title (a tooltip says it in words). */
function SharedMark({ doc }: { doc: Doc }) {
  const owner = (doc.role ?? 'owner') === 'owner';
  const people = doc.collaborators?.length ?? 0;
  const ownerName = typeof doc.owner === 'object' && doc.owner ? doc.owner.name : null;
  if (!owner) {
    const words = `Shared with you${ownerName ? ` by ${ownerName}` : ''} · you ${doc.role === 'editor' ? 'can edit' : 'can view'}`;
    return <Users className="lib-pin" strokeWidth={1.75} aria-label={words}><title>{words}</title></Users>;
  }
  if (doc.publishedAt) {
    const words = `Published to the web${people ? ` · shared with ${people} ${people === 1 ? 'person' : 'people'}` : ''}`;
    return <Globe className="lib-pin" strokeWidth={1.75} aria-label={words}><title>{words}</title></Globe>;
  }
  if (people) {
    const words = `Shared with ${people} ${people === 1 ? 'person' : 'people'}`;
    return <Users className="lib-pin" strokeWidth={1.75} aria-label={words}><title>{words}</title></Users>;
  }
  return null;
}

function DocRow({ row, hit, showSubject, onPin, onCopy, onDelete }: { row: Row; hit?: TextHit; showSubject: boolean; onPin: () => void; onCopy: () => void; onDelete: () => void }) {
  const { doc, subject, status } = row;
  const owner = (doc.role ?? 'owner') === 'owner';
  // Only when the words were found in the text (a title match shows no snippet).
  const snippet = hit && hit.marks.length > 0 ? hit : null;
  return (
    <li className={cn('lib-row rc-row', snippet && 'lib-row--hit')}>
      <Link href={`/docs/${doc._id}`} className="lib-row-link">
        <FileText className="lib-row-icon" strokeWidth={1.75} aria-hidden />
        <span className="lib-row-main">
          <span className="lib-row-title">
            <span className={cn(!doc.title && 'rc-ink-3')}>{doc.title || 'Untitled'}</span>
            {doc.isPinned && <Pin className="lib-pin" strokeWidth={1.75} aria-label="Pinned" />}
            <SharedMark doc={doc} />
          </span>
          {snippet && (
            <span className="lib-row-snippet">
              <MarkedSnippet text={snippet.snippet} marks={snippet.marks} />
            </span>
          )}
        </span>
        {showSubject && (
          <span className="lib-subject">
            {subject && (
              <>
                <span className="rc-swatch" style={{ background: subject.color ?? 'var(--rc-icon)' }} aria-hidden />
                <span className="min-w-0">{subject.name}</span>
              </>
            )}
          </span>
        )}
        <StatusCell status={status} />
        <span className="lib-edited" title={doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : undefined}>
          {doc.updatedAt ? formatRelative(doc.updatedAt) : ''}
        </span>
      </Link>
      <span className="rc-row-actions lib-row-actions">
        <RcMenu
          label={`Options for ${doc.title || 'Untitled'}`}
          actions={[
            { label: doc.isPinned ? 'Unpin' : 'Pin to top', icon: doc.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />, onSelect: onPin },
            { label: 'Copy link', icon: <Link2 className="h-4 w-4" />, onSelect: onCopy },
            ...(owner ? [{ label: 'Move to trash', icon: <Trash2 className="h-4 w-4" />, onSelect: onDelete, danger: true, separatorBefore: true }] : []),
          ]}
        >
          <RcIconButton label={`Options for ${doc.title || 'Untitled'}`} size="sm">
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
          </RcIconButton>
        </RcMenu>
      </span>
    </li>
  );
}
