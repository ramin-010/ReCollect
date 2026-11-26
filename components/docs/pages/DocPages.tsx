'use client';

/**
 * "Pages" at the end of a doc (DOC_PAGES_PLAN §4.3, N2): a quiet label line, then one row per page inside it (the
 * page glyph, the title, "3 pages" when it holds its own); the whole row is the link. The owner gets a last ghost row,
 * "+ New page", which makes "Untitled" inside this doc and opens it with the caret in the title. No pages and not the
 * owner: nothing is drawn.
 */
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Files, Plus } from 'lucide-react';
import { docApi } from '@/lib/api/docApi';
import './doc-pages.css';

export interface PageRow {
  _id: string;
  title: string;
  pages: number;
}

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
  // No pages: nothing drawn (the first page comes from the ··· menu's "Add a page inside").
  if (!pages.length) return null;
  return (
    <section className="dp" aria-label="Pages inside this doc">
      <p className="dp-label">Pages</p>
      <ul className="dp-list">
        {pages.map((p) => (
          <li key={p._id}>
            <Link href={`/docs/${p._id}`} className="dp-row">
              {p.pages > 0 ? <Files aria-hidden strokeWidth={1.75} className="dp-glyph" /> : <FileText aria-hidden strokeWidth={1.75} className="dp-glyph" />}
              <span className="dp-title">{p.title.trim() || 'Untitled'}</span>
              {p.pages > 0 && <span className="dp-count">{p.pages === 1 ? '1 page' : `${p.pages} pages`}</span>}
            </Link>
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
    </section>
  );
}
