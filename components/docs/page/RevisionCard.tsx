'use client';

/**
 * A lesson's revision card (STUDY_FLOW_PLAN §4.4), shown first at a review: the card is the doc's last section,
 * drawn read-only by the editor itself (its toggles and diagrams as in the doc). Done opens the doc at its top;
 * Quiz me and Mark as revised end the review here when it is due.
 */
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { RcButton, RcDialog, RcSkel } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';
import type { RevisionCard } from '@/lib/learning/types';
import '@/components/docs/editor/doc-editor.css';
import './revision-card.css';

const LabEditor = dynamic(() => import('@/components/docs/v2/LabEditor').then((m) => m.LabEditor), {
  ssr: false,
  loading: () => <CardSkeleton />,
});

const READER = { name: 'Reader', color: '#2383e2' };

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-2" aria-hidden>
      <RcSkel className="h-6 w-40" />
      {[0, 1, 2, 3, 4].map((i) => (
        <RcSkel key={i} className="h-4" style={{ width: `${88 - i * 9}%` }} />
      ))}
    </div>
  );
}

/** The card's own Y.Doc (never connected to anything), drawn read-only by the new editor. */
function CardBody({ state }: { state: string }) {
  const ydoc = useMemo(() => {
    const y = new Y.Doc();
    Y.applyUpdate(y, Uint8Array.from(atob(state), (c) => c.charCodeAt(0)));
    return y;
  }, [state]);
  useEffect(() => () => ydoc.destroy(), [ydoc]);
  return (
    <div className="doc-body doc-body-v2 card-body">
      <LabEditor ydoc={ydoc} provider={null} user={READER} editable={false} />
    </div>
  );
}

export interface RevisionCardDialogProps {
  /** The doc whose card to show; null closes the dialog. */
  docId: string | null;
  /** The title to show while the card loads (the review row's). */
  title?: string;
  onClose: () => void;
  /** Done: open the doc (Home), or just close (the doc page). */
  onDone: () => void;
  /** Quiz me on the due review (Home's and the doc page's Recall sheet). */
  onQuiz?: (review: NonNullable<RevisionCard['review']>, card: RevisionCard) => void;
  /** Mark the due review as revised. */
  onRevised?: (review: NonNullable<RevisionCard['review']>) => void;
}

export function RevisionCardDialog({ docId, title, onClose, onDone, onQuiz, onRevised }: RevisionCardDialogProps) {
  const [card, setCard] = useState<RevisionCard | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    setState('loading');
    setCard(null);
    learningApi
      .getRevisionCard(docId)
      .then((c) => {
        if (cancelled) return;
        // No card after all (its heading was deleted since): the review opens the doc as before.
        if (!c) {
          onDone();
          return;
        }
        setCard(c);
        setState('ready');
      })
      .catch(() => !cancelled && setState('failed'));
    return () => {
      cancelled = true;
    };
    // onDone is the caller's; reading again only when the doc changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  const review = card?.review ?? null;
  const due = !!review?.due;
  return (
    <RcDialog
      open={!!docId}
      onOpenChange={(o) => !o && onClose()}
      title={card?.title ?? title ?? 'Revision card'}
      aside={review ? `Review ${review.cycle} of ${review.of}` : undefined}
      className="rc-card-dialog"
      footer={
        <>
          {due && card && onQuiz && (
            <RcButton size="sm" variant="quiet" onClick={() => onQuiz(review!, card)}>
              Quiz me
            </RcButton>
          )}
          {due && onRevised && (
            <RcButton size="sm" variant="quiet" onClick={() => onRevised(review!)}>
              Mark as revised
            </RcButton>
          )}
          <span className="flex-1" />
          <RcButton size="sm" variant="main" onClick={onDone} autoFocus>
            Done
          </RcButton>
        </>
      }
    >
      {state === 'loading' && <CardSkeleton />}
      {state === 'failed' && <p className="rc-body rc-ink-2 py-4">The card didn&apos;t load. Done opens the whole doc.</p>}
      {state === 'ready' && card && <CardBody state={card.state} />}
    </RcDialog>
  );
}
