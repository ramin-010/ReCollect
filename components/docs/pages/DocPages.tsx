'use client';

/**
 * "Pages" at the end of a doc (DOC_PAGES_PLAN §4.3, N2): a quiet label line, then one row per page inside it (the
 * page glyph, the title, "3 pages" when it holds its own); the whole row is the link. The owner gets a last ghost row,
 * "+ New page", which makes "Untitled" inside this doc and opens it with the caret in the title, and on each row's
 * hover a "···" (Move to…, Copy link, Move to trash). No pages: nothing is drawn.
 */
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Files, FolderInput, Link2, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RcMenu } from '@/components/rc-ui';
import { docApi } from '@/lib/api/docApi';
import { useDocTreeStore } from '@/lib/store/docTreeStore';
import { MoveDocDialog } from './MoveDocDialog';
import './doc-pages.css';

export interface PageRow {
  _id: string;
  title: string;
  pages: number;
}

const titleOf = (p: { title: string }) => p.title.trim() || 'Untitled';

/** Makes "Untitled" inside a doc and opens it, the caret in its title (the existing ?new=1 flow). */
export function useNewPage(parentId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const make = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await docApi.createDoc({ title: 'Untitled', parentId });
      if (res.data?._id) router.push(`/docs/${res.data._id}?new=1`);
    } finally {
      setBusy(false);
    }
  }, [busy, parentId, router]);
  return { make, busy };
}

export function DocPages({ docId, pages, isOwner }: { docId: string; pages: PageRow[]; isOwner: boolean }) {
  const { make, busy } = useNewPage(docId);
  const refresh = useDocTreeStore((s) => s.refresh);
  const [moving, setMoving] = useState<PageRow | null>(null);
  // A page sent to the trash leaves the list at once (the tree's fresh copy follows).
  const [gone, setGone] = useState<string[]>([]);

  const copyLink = async (p: PageRow) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/docs/${p._id}`);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const trash = async (p: PageRow) => {
    setGone((g) => [...g, p._id]);
    try {
      const done = await docApi.trashDoc(p._id);
      const words = done.pages ? ` with ${done.pages} ${done.pages === 1 ? 'page' : 'pages'} inside` : '';
      toast.success(`Moved “${titleOf(p)}” to the trash${words}`, {
        description: 'Deleted for good after 30 days.',
        action: {
          label: 'Undo',
          onClick: () =>
            void docApi
              .restoreDoc(p._id)
              .then(async () => {
                await refresh();
                setGone((g) => g.filter((id) => id !== p._id));
              })
              .catch(() => toast.error('It did not come back. Try again.')),
        },
      });
      await refresh();
    } catch {
      setGone((g) => g.filter((id) => id !== p._id));
      toast.error('It did not move to the trash. Try again.');
    }
  };

  const shown = pages.filter((p) => !gone.includes(p._id));
  // No pages: nothing drawn (the first page comes from "Add a page" above the title or the ··· menu).
  if (!shown.length) return null;
  return (
    <section className="dp" aria-label="Pages inside this doc">
      <p className="dp-label">Pages</p>
      <ul className="dp-list">
        {shown.map((p) => (
          <li key={p._id} className="dp-item">
            <Link href={`/docs/${p._id}`} className={isOwner ? 'dp-row dp-row--menu' : 'dp-row'}>
              {p.pages > 0 ? <Files aria-hidden strokeWidth={1.75} className="dp-glyph" /> : <FileText aria-hidden strokeWidth={1.75} className="dp-glyph" />}
              <span className="dp-title">{titleOf(p)}</span>
              {p.pages > 0 && <span className="dp-count">{p.pages === 1 ? '1 page' : `${p.pages} pages`}</span>}
            </Link>
            {isOwner && (
              <RcMenu
                label={`Options for ${titleOf(p)}`}
                actions={[
                  { label: 'Move to…', icon: <FolderInput className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => setMoving(p) },
                  { label: 'Copy link', icon: <Link2 className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => void copyLink(p) },
                  { label: 'Move to trash', icon: <Trash2 className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => void trash(p), danger: true, separatorBefore: true },
                ]}
              >
                <button type="button" className="dp-more" aria-label={`Options for ${titleOf(p)}`}>
                  <MoreHorizontal aria-hidden strokeWidth={1.75} />
                </button>
              </RcMenu>
            )}
          </li>
        ))}
        {isOwner && (
          <li>
            <button type="button" className="dp-row dp-row--ghost" onClick={() => void make()} disabled={busy}>
              <Plus aria-hidden strokeWidth={1.75} className="dp-glyph" />
              <span className="dp-title">New page</span>
            </button>
          </li>
        )}
      </ul>
      <MoveDocDialog
        open={!!moving}
        onOpenChange={(o) => !o && setMoving(null)}
        doc={moving ? { _id: moving._id, title: titleOf(moving) } : null}
        onMoved={() => void refresh()}
      />
    </section>
  );
}
