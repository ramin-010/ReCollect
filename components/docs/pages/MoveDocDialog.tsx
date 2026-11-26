'use client';

/**
 * "Move to…" (DOC_PAGES_PLAN §4.7): a search field, then "Top level" and the user's own live docs as an indented tree.
 * The doc itself and everything inside it can't be picked, nor the doc it is in now; a target the lesson rule refuses
 * (D5: a lesson can't sit inside a lesson) says so in its row. A click moves it; the server's refusal shows inline.
 * The toast's Undo puts it back where it was (same parent, after the same sibling).
 */
import { useEffect, useMemo, useState } from 'react';
import { CornerLeftUp, FileText, Files, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcDialog } from '@/components/rc-ui';
import { docApi } from '@/lib/api/docApi';
import { learningApi } from '@/lib/api/learningApi';
import type { Doc } from '@/lib/store/docStore';
import { childrenOf, insideOf, pathOf, rootsOf, siblingsOf, visibleRows } from '@/lib/docs/tree';
import './doc-pages.css';

export interface MovedTo {
  parentId: string | null;
}

const titleOf = (d: { title?: string | null }) => d.title?.trim() || 'Untitled';

export function MoveDocDialog({
  open,
  onOpenChange,
  doc,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: { _id: string; title: string } | null;
  /** After a move and after its Undo: refresh what shows the tree. */
  onMoved?: (to: MovedTo) => void;
}) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [lessons, setLessons] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setError(null);
    let live = true;
    void Promise.all([docApi.fetchAllDocs(), learningApi.getTopicStatuses().catch(() => [])]).then(([all, statuses]) => {
      if (!live) return;
      setDocs(all as unknown as Doc[]);
      setLessons(new Set(statuses.map((s) => s.docId).filter((id): id is string => !!id)));
    });
    return () => {
      live = false;
    };
  }, [open]);

  // His own live docs: the places a doc of his can go (D7).
  const own = useMemo(() => (docs ?? []).filter((d) => (d.role ?? 'owner') === 'owner' && !d.trashedAt && !d.isArchived && !d._id.startsWith('local_')), [docs]);
  const me = doc ? own.find((d) => d._id === doc._id) ?? null : null;
  const inside = useMemo(() => (doc ? insideOf(own, doc._id) : new Set<string>()), [own, doc]);
  const branchIsLesson = !!doc && (lessons.has(doc._id) || [...inside].some((id) => lessons.has(id)));

  /** Why a doc can't take it, or null. */
  const refusal = (id: string): string | null => {
    if (!doc) return null;
    if (id === doc._id) return 'this page';
    if (inside.has(id)) return 'inside it';
    if (id === (me?.parentId ?? null)) return 'it is here';
    if (branchIsLesson && (lessons.has(id) || pathOf(own, id).some((a) => lessons.has(a._id)))) return "a lesson can't sit inside a lesson";
    return null;
  };

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    if (q) {
      return own
        .filter((d) => titleOf(d).toLowerCase().includes(q))
        .slice(0, 60)
        .map((d) => ({ node: d, depth: 0, kids: 0, path: pathOf(own, d._id).map(titleOf).join(' › ') }));
    }
    const roots = rootsOf(own).sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
    const all = new Set(own.map((d) => d._id));
    return visibleRows(own, roots, all).map((r) => ({ ...r, path: '' }));
  }, [own, q]);
  const kids = useMemo(() => childrenOf(own), [own]);

  const move = async (parentId: string | null) => {
    if (!doc || busy) return;
    setBusy(true);
    setError(null);
    // Where it was, for Undo: its parent and the sibling just before it.
    const before = me?.parentId ?? null;
    const sibs = siblingsOf(own, doc._id);
    const prev = sibs[sibs.findIndex((s) => s._id === doc._id) - 1]?._id;
    try {
      await docApi.moveDoc(doc._id, { parentId });
      const target = parentId ? own.find((d) => d._id === parentId) : null;
      onOpenChange(false);
      onMoved?.({ parentId });
      toast.success(target ? `Moved to “${titleOf(target)}”` : 'Moved to the top level', {
        action: {
          label: 'Undo',
          onClick: () =>
            void docApi
              .moveDoc(doc._id, before ? { parentId: before, after: prev ?? 'start' } : { parentId: null })
              .then(() => onMoved?.({ parentId: before }))
              .catch(() => toast.error('It could not be moved back. Try again.')),
        },
      });
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? 'It did not move. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RcDialog open={open} onOpenChange={onOpenChange} title={doc ? `Move “${titleOf(doc)}” to…` : 'Move to…'} className="mv-dialog">
      <label className="mv-search">
        <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a doc" aria-label="Find a doc to move it into" />
      </label>
      {error && (
        <p className="mv-error" role="alert">
          {error}
        </p>
      )}
      <ul className="mv-list" aria-busy={docs === null || undefined}>
        {!q && (
          <li>
            <button type="button" className="mv-row" disabled={busy || !me?.parentId} onClick={() => void move(null)}>
              <CornerLeftUp className="mv-glyph" strokeWidth={1.75} aria-hidden />
              <span className="mv-title">Top level</span>
              {!me?.parentId && <span className="mv-meta">it is here</span>}
            </button>
          </li>
        )}
        {rows.map(({ node, depth, path }) => {
          const why = refusal(node._id);
          const Glyph = (kids.get(node._id)?.length ?? 0) > 0 ? Files : FileText;
          return (
            <li key={node._id}>
              <button
                type="button"
                className={cn('mv-row', why && 'mv-row--off')}
                style={{ paddingLeft: 8 + depth * 16 }}
                disabled={busy || !!why}
                onClick={() => void move(node._id)}
              >
                <Glyph className="mv-glyph" strokeWidth={1.75} aria-hidden />
                <span className="mv-title">
                  {titleOf(node)}
                  {path && <span className="mv-path">in {path}</span>}
                </span>
                {why && <span className="mv-meta">{why}</span>}
              </button>
            </li>
          );
        })}
        {docs !== null && q && rows.length === 0 && <li className="mv-empty">No doc of yours matches “{query.trim()}”.</li>}
      </ul>
    </RcDialog>
  );
}
