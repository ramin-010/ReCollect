'use client';

/**
 * Previous and next at the foot of a page (DOC_PAGES_PLAN §4.5, N4): only on a page that has a parent and at least one
 * sibling. One quiet line: left "← previous", right "next →", each a link; the order is the pages' place in the tree.
 */
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useDocTreeStore } from '@/lib/store/docTreeStore';
import { prevNext } from '@/lib/docs/tree';
import './doc-pages.css';

export function PageFooterNav({ docId }: { docId: string }) {
  const nodes = useDocTreeStore((s) => s.nodes);
  const { prev, next } = prevNext(nodes, docId);
  if (!prev && !next) return null;
  return (
    <nav className="pf" aria-label="Pages beside this one">
      {prev && (
        <Link href={`/docs/${prev._id}`} rel="prev">
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span>{prev.title.trim() || 'Untitled'}</span>
        </Link>
      )}
      {next && (
        <Link href={`/docs/${next._id}`} rel="next" className="pf-next">
          <span>{next.title.trim() || 'Untitled'}</span>
          <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        </Link>
      )}
    </nav>
  );
}
