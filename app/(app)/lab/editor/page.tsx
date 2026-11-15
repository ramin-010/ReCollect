'use client';

/**
 * Throwaway spike route (DOCS_EDITOR_V2_PLAN §3 0b): /lab/editor?doc=<id> opens that doc's live
 * room and edits its NEW "blocks" fragment with BlockNote. Deleted when the rebuild lands.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useCollaboration } from '@/components/docs/doc_editor/useCollaboration';
import { rcScope } from '@/components/rc-ui';
import { cn } from '@/lib/utils';

const LabEditor = dynamic(() => import('@/components/docs/v2/LabEditor').then((m) => m.LabEditor), { ssr: false });

function tokenFromCookies(): string {
  const c = document.cookie.split(';').find((x) => x.trim().startsWith('token='));
  return c ? decodeURIComponent(c.split('=')[1] ?? '') : '';
}

function Lab() {
  const docId = useSearchParams().get('doc') ?? '';
  const user = useAuthStore((s) => s.user);
  const [token, setToken] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the cookie is read once after mount, as on the doc page
  useEffect(() => setToken(tokenFromCookies()), []);
  const me = useMemo(() => ({ id: user?._id ?? 'guest', name: user?.name ?? 'You', color: '#2383e2', avatar: user?.avatar }), [user?._id, user?.name, user?.avatar]);
  const { ydoc, provider, connect, disconnect, status } = useCollaboration({ documentName: `doc_${docId}`, token: token ?? '', user: me });
  const started = useRef(false);
  useEffect(() => {
    if (docId && token !== null && !started.current) {
      started.current = true;
      connect();
    }
  }, [docId, token, connect]);
  useEffect(() => () => disconnect(), [disconnect]);

  if (!docId) return <p className="rc-body p-10">Add ?doc=&lt;id&gt; to open a doc in the lab editor.</p>;
  return (
    <div className={cn(rcScope, 'min-h-full')} data-lab-status={status}>
      <p className="rc-meta px-24 pt-6">Lab editor · BlockNote spike · fragment “blocks” · {status}</p>
      {ydoc ? <LabEditor ydoc={ydoc} provider={provider} user={{ name: me.name, color: me.color }} /> : <p className="rc-body px-24 pt-6">Connecting…</p>}
    </div>
  );
}

export default function LabEditorRoute() {
  return (
    <Suspense>
      <Lab />
    </Suspense>
  );
}
