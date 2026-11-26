'use client';

/**
 * The page block (DOC_PAGES_PLAN §5): a full-width row with the page's glyph and its live title; a click opens it. The
 * title comes from the open tree, else the library's list, else one read of the doc. A page that is gone or not open
 * to this person says "Page not available"; one in the trash says so. A page that is not inside this doc (a link to a
 * page elsewhere) has a small arrow on its glyph.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createReactBlockSpec } from '@blocknote/react';
import { ArrowUpRight, FileText, Files } from 'lucide-react';
import { rcScope } from '@/components/rc-ui';
import { docApi } from '@/lib/api/docApi';
import { useDocStore } from '@/lib/store/docStore';
import { useDocTreeStore } from '@/lib/store/docTreeStore';
import { pageBlockConfig } from './spec';

type Seen = { state: 'ok'; title: string; parentId: string | null } | { state: 'gone' } | { state: 'trash'; title: string } | null;

function PageBlockView({ docId }: { docId: string }) {
  const router = useRouter();
  const node = useDocTreeStore((s) => s.nodes.find((n) => n._id === docId) ?? null);
  const openDocId = useDocTreeStore((s) => s.docId);
  const hasKids = useDocTreeStore((s) => s.nodes.some((n) => n.parentId === docId));
  const listed = useDocStore((s) => s.docs.find((d) => d._id === docId) ?? null);
  const [fetched, setFetched] = useState<Seen>(null);

  // Not in the tree nor the list: read it once (a page elsewhere, or one not open to this person).
  const known = !!node || (!!listed && !listed.trashedAt);
  useEffect(() => {
    if (known || !docId) return;
    let live = true;
    docApi
      .fetchDoc(docId)
      .then((d) => {
        if (!live) return;
        if (!d) setFetched({ state: 'gone' });
        else if (d.trashedAt) setFetched({ state: 'trash', title: d.title });
        else setFetched({ state: 'ok', title: d.title, parentId: (d as { parentId?: string | null }).parentId ?? null });
      })
      .catch(() => live && setFetched({ state: 'gone' }));
    return () => {
      live = false;
    };
  }, [docId, known]);

  const seen: Seen = node
    ? { state: 'ok', title: node.title, parentId: node.parentId }
    : listed
      ? listed.trashedAt
        ? { state: 'trash', title: listed.title }
        : { state: 'ok', title: listed.title, parentId: listed.parentId ?? null }
      : fetched;
  const title = seen && seen.state !== 'gone' ? seen.title.trim() || 'Untitled' : '';
  // A link to a page elsewhere: its parent is not the doc this block is in.
  const elsewhere = seen?.state === 'ok' && !!openDocId && seen.parentId !== openDocId;
  const Glyph = hasKids ? Files : FileText;

  if (!docId || seen?.state === 'gone') {
    return (
      <div className={`${rcScope} doc-page-block doc-page-block--off`} contentEditable={false}>
        <FileText className="doc-page-block-glyph" strokeWidth={1.75} aria-hidden />
        <span className="doc-page-block-title">Page not available</span>
      </div>
    );
  }
  return (
    <a
      href={`/docs/${docId}`}
      className={`${rcScope} doc-page-block${seen?.state === 'trash' ? ' doc-page-block--off' : ''}`}
      contentEditable={false}
      draggable={false}
      onMouseDown={(e) => {
        // A click opens the page; it never puts the caret in the row.
        if (e.button === 0) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        router.push(`/docs/${docId}`);
      }}
    >
      <span className="doc-page-block-icon" aria-hidden>
        <Glyph className="doc-page-block-glyph" strokeWidth={1.75} />
        {elsewhere && <ArrowUpRight className="doc-page-block-away" strokeWidth={2.25} />}
      </span>
      <span className="doc-page-block-title">{seen ? title : ' '}</span>
      {seen?.state === 'trash' && <span className="doc-page-block-meta">In the trash</span>}
    </a>
  );
}

/** The page block as a BlockNote block: no content of its own, only the page it points at. */
export const pageBlock = createReactBlockSpec(pageBlockConfig, {
  render: ({ block }) => <PageBlockView docId={String(block.props.docId ?? '')} />,
});
