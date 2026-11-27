'use client';

/**
 * "Link to page" (DOC_PAGES_PLAN §5, the slash menu): a search field, then the user's own live docs as an indented tree
 * (with words typed, the matches with the docs above them). A click, or Enter on the marked row, puts a page block for
 * that doc where the caret was; the block points at the doc and never moves it (D2). The doc being edited can't be picked.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Files, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcDialog } from '@/components/rc-ui';
import { docApi } from '@/lib/api/docApi';
import type { Doc } from '@/lib/store/docStore';
import { childrenOf, pickerRows } from '@/lib/docs/tree';
import './doc-pages.css';

const titleOf = (d: { title?: string | null }) => d.title?.trim() || 'Untitled';

export function LinkPageDialog({
  open,
  onOpenChange,
  docId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The doc being edited (it can't link to itself). */
  docId: string;
  onPick: (doc: { _id: string; title: string }) => void;
}) {
  return (
    <RcDialog open={open} onOpenChange={onOpenChange} title="Link to a page" className="mv-dialog">
      {/* Mounted only while open, so each opening starts with an empty search and a fresh list. */}
      <LinkPagePicker
        docId={docId}
        onPick={(d) => {
          onOpenChange(false);
          onPick(d);
        }}
      />
    </RcDialog>
  );
}

function LinkPagePicker({ docId, onPick }: { docId: string; onPick: (doc: { _id: string; title: string }) => void }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let live = true;
    void docApi
      .fetchAllDocs()
      .then((all) => live && setDocs(all as unknown as Doc[]))
      .catch(() => live && setDocs([]));
    return () => {
      live = false;
    };
  }, []);

  // His own live docs (the same set "Move to…" offers).
  const own = useMemo(() => (docs ?? []).filter((d) => (d.role ?? 'owner') === 'owner' && !d.trashedAt && !d.isArchived && !d._id.startsWith('local_')), [docs]);
  const q = query.trim().toLowerCase();
  const rows = useMemo(() => pickerRows(own, q), [own, q]);
  const kids = useMemo(() => childrenOf(own), [own]);
  const pickable = rows.filter((r) => r.node._id !== docId);

  const pick = (d: Doc) => onPick({ _id: d._id, title: titleOf(d) });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(pickable.length - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1)));
      setActive(next);
      const id = pickable[next]?.node._id;
      if (id) listRef.current?.querySelector<HTMLElement>(`[data-doc="${id}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const r = pickable[active];
      if (r) pick(r.node);
    }
  };

  const activeId = pickable[active]?.node._id ?? null;
  return (
    <div onKeyDown={onKeyDown}>
      <label className="mv-search">
        <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder="Find a doc"
          aria-label="Find a doc to link to"
        />
      </label>
      <ul ref={listRef} className="mv-list" aria-busy={docs === null || undefined}>
        {rows.map(({ node, depth, path }) => {
          const self = node._id === docId;
          const Glyph = (kids.get(node._id)?.length ?? 0) > 0 ? Files : FileText;
          return (
            <li key={node._id}>
              <button
                type="button"
                data-doc={node._id}
                className={cn('mv-row', self && 'mv-row--off', node._id === activeId && 'mv-row--active')}
                style={{ paddingLeft: 8 + depth * 16 }}
                disabled={self}
                onMouseEnter={() => {
                  const i = pickable.findIndex((r) => r.node._id === node._id);
                  if (i >= 0) setActive(i);
                }}
                onClick={() => pick(node)}
              >
                <Glyph className="mv-glyph" strokeWidth={1.75} aria-hidden />
                <span className="mv-title">
                  {titleOf(node)}
                  {path && <span className="mv-path">in {path}</span>}
                </span>
                {self && <span className="mv-meta">this page</span>}
              </button>
            </li>
          );
        })}
        {docs !== null && rows.length === 0 && <li className="mv-empty">{q ? `No doc of yours matches “${query.trim()}”.` : 'No docs yet.'}</li>}
      </ul>
    </div>
  );
}
