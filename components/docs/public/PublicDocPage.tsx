'use client';

/**
 * A published doc as anyone reads it (/p/<slug>, MANAGER_AND_DOCS_PLAN §2): the app's own look, drawn by
 * the new editor, read-only. The server sends a Y.Doc holding only the page (the blocks and their
 * boards); a doc still on the old editor arrives converted. A reader who is logged in can ask to
 * edit; one who has the doc in the app opens it there.
 */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Y from 'yjs';
import { Check, PencilLine } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcButton, RcSkel, rcScope } from '@/components/rc-ui';
import { useAuthStore } from '@/lib/store/authStore';
import { publicDocApi, shareError, type PublicDoc } from '@/lib/api/sharingApi';
import '@/components/docs/editor/doc-editor.css';
import './public-doc.css';
import { KaagaLogo } from '@/components/brand/kaaga';

const LabEditor = dynamic(() => import('@/components/docs/v2/LabEditor').then((m) => m.LabEditor), {
  ssr: false,
  loading: () => <BodySkeleton />,
});

const READER = { name: 'Reader', color: '#2383e2' };

function BodySkeleton() {
  return (
    <div aria-hidden>
      <RcSkel className="mt-6 h-4 w-full" />
      <RcSkel className="mt-3 h-4 w-5/6" />
      <RcSkel className="mt-3 h-4 w-4/6" />
    </div>
  );
}

export function PublicDocPage({ slug }: { slug: string }) {
  const [doc, setDoc] = useState<PublicDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const authLoading = useAuthStore((s) => s.isLoading);
  const loggedIn = useAuthStore((s) => s.isAuthenticated);

  // Read again once the login is known, so a logged-in reader gets what they may do.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    publicDocApi
      .read(slug)
      .then((d) => !cancelled && setDoc(d))
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
    };
  }, [slug, authLoading, loggedIn]);

  useEffect(() => {
    if (doc) document.title = `${doc.title} · Kaaga`;
  }, [doc]);

  if (missing) {
    return (
      <Frame>
        <div className="doc-column pub-gone">
          <h1 className="rc-h1">This page isn&apos;t published</h1>
          <p className="rc-body rc-ink-2 mt-2">The link may be wrong, or its owner stopped publishing it.</p>
          <Link href="/" className="rc-btn rc-btn--outline mt-5 inline-flex">
            Go to Kaaga
          </Link>
        </div>
      </Frame>
    );
  }

  if (!doc) {
    return (
      <Frame>
        <div className="doc-column pub-column" aria-busy>
          <RcSkel className="h-10 w-2/3" />
          <RcSkel className="mt-3 h-4 w-40" />
          <BodySkeleton />
        </div>
      </Frame>
    );
  }

  return (
    <Frame actions={<ReaderActions slug={slug} doc={doc} onAsked={() => setDoc({ ...doc, access: 'requested' })} />}>
      {doc.coverImage && (
        <div className="doc-cover">
          {/* eslint-disable-next-line @next/next/no-img-element -- covers come from any host */}
          <img src={doc.coverImage} alt="" />
        </div>
      )}
      <article className={cn('doc-column pub-column', doc.coverImage && 'pub-column--cover')}>
        <h1 className="doc-title pub-title">{doc.title}</h1>
        <p className="pub-meta">
          By {doc.owner.name} · updated {new Date(doc.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <PublicBody state={doc.state} />
      </article>
    </Frame>
  );
}

/** The page's own Y.Doc (never connected to anything), drawn read-only by the new editor. */
function PublicBody({ state }: { state: string }) {
  const ydoc = useMemo(() => {
    const y = new Y.Doc();
    const bytes = Uint8Array.from(atob(state), (c) => c.charCodeAt(0));
    Y.applyUpdate(y, bytes);
    return y;
  }, [state]);
  useEffect(() => () => ydoc.destroy(), [ydoc]);
  return (
    <div className="doc-body doc-body-v2 pub-body">
      <LabEditor ydoc={ydoc} provider={null} user={READER} editable={false} />
    </div>
  );
}

function ReaderActions({ slug, doc, onAsked }: { slug: string; doc: PublicDoc; onAsked: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const askedOnce = useRef(false);

  const ask = async () => {
    if (doc.access === 'anonymous') {
      router.push(`/login?redirect=${encodeURIComponent(`/p/${slug}?ask=1`)}`);
      return;
    }
    setBusy(true);
    try {
      await publicDocApi.askToEdit(slug);
      onAsked();
      toast.success(`Asked ${doc.owner.name} to let you edit`, { description: 'You get a notification and an email when they say yes.' });
    } catch (err) {
      toast.error(shareError(err, 'The request did not go through. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  // Back from logging in to ask: ask now (what they clicked), once.
  useEffect(() => {
    if (askedOnce.current || params.get('ask') !== '1') return;
    askedOnce.current = true;
    router.replace(`/p/${slug}`);
    if (doc.access === 'none' || doc.access === 'viewer') void ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the page knows the reader
  }, [doc.access]);

  const open = doc.docId ? (
    <Link href={`/docs/${doc.docId}`} className="rc-btn rc-btn--main rc-btn--sm">
      Open in Kaaga
    </Link>
  ) : null;

  if (doc.access === 'owner' || doc.access === 'editor') return open;
  if (doc.access === 'requested')
    return (
      <>
        <span className="pub-asked">
          <Check aria-hidden />
          Asked to edit
        </span>
        {open}
      </>
    );
  return (
    <>
      <RcButton size="sm" variant="outline" busy={busy} icon={<PencilLine className="h-4 w-4" strokeWidth={1.75} />} onClick={() => void ask()}>
        Ask to edit
      </RcButton>
      {open}
    </>
  );
}

function Frame({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className={cn(rcScope, 'pub-page doc-page')}>
      <header className="pub-bar">
        <Link href="/" className="pub-brand" aria-label="Kaaga">
          <KaagaLogo height={20} variant="sidebar" />
        </Link>
        <div className="pub-actions">{actions}</div>
      </header>
      <main>{children}</main>
    </div>
  );
}
