'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, CalendarClock, CheckCircle2, FileText, Link2, MoreHorizontal, Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcConfirm, RcIconButton, RcMenu, RcSegmented, RcSkel } from '@/components/rc-ui';
import { RcPicker } from '@/components/rc-ui/RcPicker';
import { docApi } from '@/lib/api/docApi';
import { learningApi } from '@/lib/api/learningApi';
import { useDocStore, type Doc } from '@/lib/store/docStore';
import type { Subject, SubjectWithTopics, TopicStatus } from '@/lib/learning/types';
import { formatRelative, formatStampDay } from '@/components/docs/page/format';
import { NewDocDialog } from './NewDocDialog';
import './docs-library.css';

type View = 'all' | 'due' | 'pinned' | 'shared';
type Sort = 'edited' | 'created' | 'title';
const UNFILED = '__unfiled';

interface Row {
  doc: Doc;
  subject: Subject | null;
  status: TopicStatus | null;
}

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
  const [view, setView] = useState<View>('all');
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('edited');
  const [newOpen, setNewOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Doc | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Old deep links (/docs?id=…) open the doc page.
  useEffect(() => {
    const id = params.get('id');
    if (id) router.replace(`/docs/${encodeURIComponent(id)}`);
  }, [params, router]);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const [d, s, st] = await Promise.all([
        docApi.fetchAllDocs(),
        learningApi.getSubjects().catch(() => [] as SubjectWithTopics[]),
        learningApi.getTopicStatuses().catch(() => [] as TopicStatus[]),
      ]);
      setDocs(d.map((x) => { const doc = x as unknown as Doc; return { ...doc, docType: doc.docType ?? 'notes' }; }));
      setSubjects(s);
      setStatuses(st);
    } catch {
      setLoadFailed(true);
    }
  }, [setDocs]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: Row[] = useMemo(() => {
    const byDoc = new Map<string, TopicStatus>();
    for (const s of statuses ?? []) if (s.docId) byDoc.set(s.docId, s);
    const subjectById = new Map(subjects.map((s) => [s._id, s]));
    return docs
      .filter((d) => !d.isArchived && !d._id.startsWith('local_'))
      .map((doc) => {
        const status = byDoc.get(doc._id) ?? null;
        return { doc, status, subject: status ? subjectById.get(status.subjectId) ?? null : null };
      });
  }, [docs, statuses, subjects]);

  const isDue = (r: Row) => r.status?.state === 'due';
  const counts = useMemo(
    () => ({
      all: rows.length,
      due: rows.filter(isDue).length,
      pinned: rows.filter((r) => r.doc.isPinned).length,
      shared: rows.filter((r) => (r.doc.role ?? 'owner') !== 'owner').length,
    }),
    [rows],
  );

  const subjectCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = r.subject?._id ?? UNFILED;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (view === 'due' && !isDue(r)) return false;
      if (view === 'pinned' && !r.doc.isPinned) return false;
      if (view === 'shared' && (r.doc.role ?? 'owner') === 'owner') return false;
      if (subjectFilter === UNFILED && r.subject) return false;
      if (subjectFilter && subjectFilter !== UNFILED && r.subject?._id !== subjectFilter) return false;
      if (q && !(r.doc.title || 'untitled').toLowerCase().includes(q) && !r.subject?.name.toLowerCase().includes(q)) return false;
      return true;
    });
    const time = (s?: string) => (s ? new Date(s).getTime() : 0);
    list.sort((a, b) => {
      if (a.doc.isPinned !== b.doc.isPinned && view !== 'pinned') return a.doc.isPinned ? -1 : 1;
      if (sort === 'title') return (a.doc.title || 'Untitled').localeCompare(b.doc.title || 'Untitled');
      if (sort === 'created') return time(b.doc.createdAt) - time(a.doc.createdAt);
      return time(b.doc.updatedAt) - time(a.doc.updatedAt);
    });
    return list;
  }, [rows, view, subjectFilter, query, sort]);

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
      toast.success('Doc deleted');
      setToDelete(null);
    } catch {
      toast.error('The doc was not deleted. Try again.');
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

  const views = [
    { value: 'all' as View, label: 'All', count: counts.all },
    { value: 'due' as View, label: 'Due', count: counts.due },
    { value: 'pinned' as View, label: 'Pinned', count: counts.pinned },
    ...(counts.shared ? [{ value: 'shared' as View, label: 'Shared with me', count: counts.shared }] : []),
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
          <RcSegmented label="Show" options={views} value={view} onChange={setView} />
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
        </div>

        <div className="lib-body">
          <nav className="lib-rail" aria-label="Subjects">
            <div className="lib-rail-label">Subjects</div>
            <button type="button" className="lib-rail-item" aria-current={subjectFilter === null || undefined} onClick={() => setSubjectFilter(null)}>
              <span className="min-w-0 flex-1 text-left">All docs</span>
              <span className="lib-count">{counts.all}</span>
            </button>
            {subjects.map((s) => (
              <button
                key={s._id}
                type="button"
                className="lib-rail-item"
                aria-current={subjectFilter === s._id || undefined}
                onClick={() => setSubjectFilter(subjectFilter === s._id ? null : s._id)}
              >
                <span className="rc-swatch" style={{ background: s.color ?? 'var(--rc-icon)' }} aria-hidden />
                <span className="min-w-0 flex-1 text-left">{s.name}</span>
                <span className="lib-count">{subjectCounts.get(s._id) ?? 0}</span>
              </button>
            ))}
            {(subjectCounts.get(UNFILED) ?? 0) > 0 && (
              <button type="button" className="lib-rail-item" aria-current={subjectFilter === UNFILED || undefined} onClick={() => setSubjectFilter(subjectFilter === UNFILED ? null : UNFILED)}>
                <span className="min-w-0 flex-1 text-left">Not filed</span>
                <span className="lib-count">{subjectCounts.get(UNFILED)}</span>
              </button>
            )}
          </nav>

          <section className="lib-list" aria-label="Docs" aria-busy={loading || undefined} data-subject={subjectFilter ? 'hidden' : undefined}>
            {loadFailed ? (
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
                      setSubjectFilter(null);
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
                    showSubject={!subjectFilter}
                    onPin={() => void togglePin(r.doc)}
                    onCopy={() => void copyLink(r.doc)}
                    onDelete={() => setToDelete(r.doc)}
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
        title={`Delete “${toDelete?.title || 'Untitled'}”?`}
        body="It leaves Docs for everyone it is shared with. Its revision history stays."
        confirmLabel="Delete doc"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function StatusCell({ status }: { status: TopicStatus | null }) {
  if (!status) return <span className="lib-status" />;
  switch (status.state) {
    case 'due':
      return (
        <span className="lib-status lib-status--due">
          <CalendarClock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Revise today
        </span>
      );
    case 'early':
      return <span className="lib-status">Next tomorrow</span>;
    case 'wait':
      return <span className="lib-status">{status.next ? `Next ${formatStampDay(status.next.scheduledFor)}` : 'Scheduled'}</span>;
    case 'completed':
      return (
        <span className="lib-status lib-status--good">
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Mastered
        </span>
      );
    default:
      return <span className="lib-status lib-status--quiet">Not scheduled</span>;
  }
}

function DocRow({ row, showSubject, onPin, onCopy, onDelete }: { row: Row; showSubject: boolean; onPin: () => void; onCopy: () => void; onDelete: () => void }) {
  const { doc, subject, status } = row;
  const owner = (doc.role ?? 'owner') === 'owner';
  return (
    <li className="lib-row rc-row">
      <Link href={`/docs/${doc._id}`} className="lib-row-link">
        <FileText className="lib-row-icon" strokeWidth={1.75} aria-hidden />
        <span className="lib-row-title">
          <span className={cn(!doc.title && 'rc-ink-3')}>{doc.title || 'Untitled'}</span>
          {doc.isPinned && <Pin className="lib-pin" strokeWidth={1.75} aria-label="Pinned" />}
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
            ...(owner ? [{ label: 'Delete doc', icon: <Trash2 className="h-4 w-4" />, onSelect: onDelete, danger: true, separatorBefore: true }] : []),
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
