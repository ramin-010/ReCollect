'use client';

import { EditorContent } from '@tiptap/react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type * as Y from 'yjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FileDown, ImagePlus, Link2, MoreHorizontal, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcConfirm, RcIconButton, RcMenu, RcSkel } from '@/components/rc-ui';
import { useAuthStore } from '@/lib/store/authStore';
import { useDocStore, type Doc } from '@/lib/store/docStore';
import { useTopBar } from '@/lib/store/topBarStore';
import { docApi } from '@/lib/api/docApi';
import { agentApi } from '@/lib/api/agentApi';
import { trackVisit } from '@/lib/services/recentVisits';
import { DOC_IMAGE_EVENT } from '@/lib/editor/blockTypes';
import { templateById } from '@/lib/docs/templates';
import { useCollaboration } from '@/components/docs/doc_editor/useCollaboration';
import { CoverPicker } from '@/components/docs/doc_editor/CoverPicker';
import { ImageUploadDialog } from '@/components/docs/ImageUploadDialog';
import { ShareDialog } from '@/components/docs/ShareDialog';
import { BlockHandle } from '@/components/docs/editor/BlockHandle';
import { FormatBar } from '@/components/docs/editor/FormatBar';
import { useLiveDocEditor } from '@/components/docs/editor/useLiveDocEditor';
import { DocProperties } from './DocProperties';
import '@/components/docs/editor/doc-editor.css';

const CARET_COLORS = ['#2383e2', '#d9730d', '#0f7b6c', '#9065b0', '#c14c8a', '#dfab01', '#e03e3e', '#64473a'];

function caretColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return CARET_COLORS[Math.abs(h) % CARET_COLORS.length]!;
}

function tokenFromCookies(): string {
  const c = document.cookie.split(';').find((x) => x.trim().startsWith('token='));
  return c ? decodeURIComponent(c.split('=')[1] ?? '') : '';
}

type Role = 'owner' | 'editor' | 'viewer';

/** /docs/[id]: one live doc. Loads the doc's metadata, connects to the live room, then renders the page. */
export function DocPage({ id }: { id: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const storeDoc = useDocStore((s) => s.docs.find((d) => d._id === id) ?? null);
  const [doc, setDoc] = useState<Doc | null>(storeDoc);
  const [missing, setMissing] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(tokenFromCookies());
  }, []);

  useEffect(() => {
    let cancelled = false;
    docApi
      .fetchDoc(id)
      .then((d) => {
        if (cancelled) return;
        if (!d) setMissing(true);
        else setDoc((prev) => ({ ...(prev ?? {}), ...(d as unknown as Doc), docType: (d as unknown as Doc).docType ?? 'notes' }));
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (doc?._id) trackVisit({ itemId: doc._id, itemType: 'doc', title: doc.title || 'Untitled', route: `/docs/${doc._id}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per doc
  }, [doc?._id]);

  const me = useMemo(
    () => ({ id: user?._id ?? 'guest', name: user?.name ?? 'You', color: caretColor(user?._id ?? 'guest'), avatar: user?.avatar }),
    [user?._id, user?.name, user?.avatar],
  );

  const { ydoc, provider, collaborators, connect, disconnect, wasRemovedByOwner } = useCollaboration({
    documentName: `doc_${id}`,
    token: token ?? '',
    user: me,
  });

  const connected = useRef(false);
  useEffect(() => {
    if (token !== null && !connected.current) {
      connected.current = true;
      connect();
    }
  }, [token, connect]);
  useEffect(() => () => disconnect(), [disconnect]);

  const role: Role = (doc?.role as Role | undefined) ?? 'owner';

  if (missing || wasRemovedByOwner) {
    return (
      <div className={cn(rcScope, 'doc-page')}>
        <div className="doc-column doc-gone">
          <h1 className="rc-h1">{wasRemovedByOwner ? 'You no longer have access' : 'This doc isn’t here'}</h1>
          <p className="rc-body rc-ink-2 mt-2">
            {wasRemovedByOwner ? 'The owner removed you from this doc.' : 'It may have been deleted, or the link is wrong.'}
          </p>
          <RcButton className="mt-5" variant="outline" onClick={() => router.push('/docs')}>
            Back to Docs
          </RcButton>
        </div>
      </div>
    );
  }

  if (!doc || !ydoc || !provider) {
    return (
      <div className={cn(rcScope, 'doc-page')} aria-busy>
        <div className="doc-column">
          <RcSkel className="mt-[72px] h-10 w-2/3" />
          <div className="doc-props">
            {[0, 1, 2].map((i) => (
              <div key={i} className="doc-prop">
                <RcSkel className="h-4 w-24" />
                <RcSkel className="h-4 w-40" />
              </div>
            ))}
          </div>
          <RcSkel className="mt-8 h-4 w-full" />
          <RcSkel className="mt-3 h-4 w-5/6" />
          <RcSkel className="mt-3 h-4 w-4/6" />
        </div>
      </div>
    );
  }

  return (
    <DocSurface
      key={doc._id}
      doc={doc}
      role={role}
      ydoc={ydoc}
      provider={provider}
      me={me}
      collaborators={collaborators}
      onDeleted={() => router.push('/docs')}
    />
  );
}

type Collaborator = { clientId: number; id?: string; name: string; color: string; avatar?: string; isCurrentUser?: boolean };

function DocSurface({
  doc,
  role,
  ydoc,
  provider,
  me,
  collaborators,
  onDeleted,
}: {
  doc: Doc;
  role: Role;
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  me: { id: string; name: string; color: string };
  collaborators: Collaborator[];
  onDeleted: () => void;
}) {
  const editable = role !== 'viewer';
  const isOwner = role === 'owner';
  const editor = useLiveDocEditor({ ydoc, provider, user: { name: me.name, color: me.color }, docId: doc._id, editable });
  const updateStoreDoc = useDocStore((s) => s.updateDoc);
  const removeStoreDoc = useDocStore((s) => s.removeDoc);
  const setTopBar = useTopBar((s) => s.setTopBar);
  const clearTopBar = useTopBar((s) => s.clearTopBar);
  const meta = useMemo(() => ydoc.getMap('metadata'), [ydoc]);
  const [title, setTitle] = useState<string>(() => (meta.get('title') as string | undefined) ?? doc.title ?? '');
  const [cover, setCover] = useState<string | null>(() => (meta.get('coverImage') as string | null | undefined) ?? doc.coverImage ?? null);
  const [synced, setSynced] = useState(provider.isSynced);
  const [shareOpen, setShareOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The title and cover live in the doc's Y.Map so every tab (and an agent) sees them live; the server copies them to the row.
  useEffect(() => {
    const onSync = () => {
      setSynced(true);
      if (isOwner && meta.get('title') === undefined) {
        ydoc.transact(() => {
          meta.set('title', doc.title || '');
          meta.set('coverImage', doc.coverImage ?? null);
        });
      }
    };
    if (provider.isSynced) onSync();
    provider.on('synced', onSync);
    return () => {
      provider.off('synced', onSync);
    };
  }, [provider, meta, ydoc, isOwner, doc.title, doc.coverImage]);

  useEffect(() => {
    const observe = () => {
      const t = meta.get('title');
      const c = meta.get('coverImage');
      if (typeof t === 'string') setTitle((cur) => (cur === t ? cur : t));
      if (c !== undefined) setCover((c as string | null) ?? null);
    };
    meta.observe(observe);
    return () => meta.unobserve(observe);
  }, [meta]);

  const changeTitle = (value: string) => {
    const v = value.replace(/\n/g, ' ');
    setTitle(v);
    meta.set('title', v);
    updateStoreDoc(doc._id, { title: v });
  };

  const changeCover = (url: string | null) => {
    setCover(url);
    meta.set('coverImage', url);
    updateStoreDoc(doc._id, { coverImage: url });
  };

  // The title wraps like Notion's: grow the textarea to its content.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    const onImage = () => setImageOpen(true);
    window.addEventListener(DOC_IMAGE_EVENT, onImage);
    return () => window.removeEventListener(DOC_IMAGE_EVENT, onImage);
  }, []);

  // A doc made from a template (/docs/:id?template=dsa) gets its sections once, while still empty.
  const params = useSearchParams();
  const router = useRouter();
  const templateId = params.get('template');
  useEffect(() => {
    if (!editor || !synced || !templateId) return;
    const t = templateById(templateId);
    // Deferred: node views render with flushSync, which React refuses inside an effect.
    const timer = setTimeout(() => {
      if (t && editable && editor.isEmpty) editor.commands.setContent({ type: 'doc', content: t.content });
      router.replace(`/docs/${doc._id}`);
    }, 0);
    return () => clearTimeout(timer);
  }, [editor, synced, templateId, editable, router, doc._id]);

  // An empty new doc starts in the title; otherwise focus stays where the reader puts it.
  useEffect(() => {
    if (editable && synced && !title && editor?.isEmpty) titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, after the first sync
  }, [synced, editor]);

  const others = collaborators.filter((c) => !c.isCurrentUser);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/docs/${doc._id}`);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }, [doc._id]);

  const copyMarkdown = useCallback(async () => {
    try {
      const md = await agentApi.docMarkdown(doc._id);
      await navigator.clipboard.writeText(`# ${title.trim() || 'Untitled'}\n\n${md}`);
      toast.success('Copied as Markdown');
    } catch {
      toast.error('Could not copy the doc as Markdown');
    }
  }, [doc._id, title]);

  const deleteDoc = async () => {
    setDeleting(true);
    try {
      await docApi.deleteDoc(doc._id);
      removeStoreDoc(doc._id);
      toast.success('Doc deleted');
      onDeleted();
    } catch {
      toast.error('The doc was not deleted. Try again.');
      setDeleting(false);
    }
  };

  // Fill the top bar: breadcrumb and the page's actions.
  useEffect(() => {
    setTopBar({
      crumbs: [{ label: 'Docs', href: '/docs' }, { label: title.trim() || 'Untitled' }],
      actions: (
        <div className={cn(rcScope, 'flex items-center gap-1')}>
          <span className="doc-sync" data-state={synced ? 'saved' : 'saving'} aria-live="polite">
            {synced ? 'Saved' : 'Connecting…'}
          </span>
          {others.length > 0 && (
            <span className="doc-presence" aria-label={`${others.length} more ${others.length === 1 ? 'person' : 'people'} here`}>
              {others.slice(0, 3).map((c) => (
                <span key={c.clientId} className="doc-presence-dot" style={{ background: c.color }} title={c.name}>
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </span>
          )}
          {isOwner && (
            <RcButton size="sm" variant="quiet" icon={<Share2 className="h-4 w-4" strokeWidth={1.75} />} onClick={() => setShareOpen(true)}>
              Share
            </RcButton>
          )}
          <RcMenu
            label="Doc options"
            actions={[
              { label: 'Copy link', icon: <Link2 className="h-4 w-4" strokeWidth={1.75} />, onSelect: copyLink },
              { label: 'Copy as Markdown', icon: <FileDown className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => void copyMarkdown() },
              ...(editable ? [{ label: cover ? 'Change cover' : 'Add cover', icon: <ImagePlus className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => setCoverOpen(true) }] : []),
              ...(isOwner ? [{ label: 'Delete doc', icon: <Trash2 className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => setConfirmDelete(true), danger: true, separatorBefore: true }] : []),
            ]}
          >
            <RcIconButton label="Doc options" size="sm">
              <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </RcIconButton>
          </RcMenu>
        </div>
      ),
    });
  }, [setTopBar, title, synced, others.length, isOwner, editable, cover, copyLink, copyMarkdown, others]);

  useEffect(() => () => clearTopBar(), [clearTopBar]);

  return (
    <div ref={scrollRef} className={cn(rcScope, 'doc-page')}>
      {cover && (
        <div className="doc-cover">
          {/* eslint-disable-next-line @next/next/no-img-element -- covers come from any host */}
          <img src={cover} alt="" />
          {editable && (
            <div className="doc-cover-actions">
              <RcButton size="sm" variant="outline" onClick={() => setCoverOpen(true)}>
                Change cover
              </RcButton>
              <RcButton size="sm" variant="outline" onClick={() => changeCover(null)}>
                Remove
              </RcButton>
            </div>
          )}
        </div>
      )}

      <div className={cn('doc-column', cover ? 'pt-8' : 'pt-[72px]')}>
        {editable && !cover && (
          <div className="doc-page-actions">
            <button type="button" className="doc-ghost-btn" onClick={() => setCoverOpen(true)}>
              <ImagePlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Add cover
            </button>
          </div>
        )}
        <textarea
          ref={titleRef}
          className="doc-title"
          value={title}
          rows={1}
          placeholder="Untitled"
          aria-label="Title"
          readOnly={!editable}
          onChange={(e) => changeTitle(e.target.value)}
          onKeyDown={(e) => {
            if (!editor) return;
            const el = e.currentTarget;
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              // As in Notion: Enter starts a new first line (taking any text after the caret with
              // it), unless the body already starts with an empty one.
              e.preventDefault();
              const at = el.selectionStart ?? el.value.length;
              const tail = el.value.slice(at);
              if (tail) changeTitle(el.value.slice(0, at).trimEnd());
              const first = editor.state.doc.firstChild;
              const emptyFirst = first?.type.name === 'paragraph' && first.content.size === 0;
              // Focus synchronously so the very next keystroke lands in the body, not the title.
              editor.view.focus();
              if (emptyFirst && !tail) editor.commands.focus('start');
              else
                editor
                  .chain()
                  .insertContentAt(0, { type: 'paragraph', content: tail.trim() ? [{ type: 'text', text: tail.trim() }] : [] })
                  .setTextSelection(1)
                  .focus()
                  .run();
            } else if (e.key === 'ArrowDown' && el.selectionStart === el.value.length) {
              e.preventDefault();
              editor.view.focus();
              editor.commands.focus('start');
            }
          }}
        />

        <DocProperties docId={doc._id} updatedAt={doc.updatedAt} editable={editable} />

        <div className="doc-body">
          {editor && editable && <BlockHandle editor={editor} />}
          {editor && editable && <FormatBar editor={editor} />}
          <EditorContent editor={editor} />
          {/* The empty space below the doc: a click puts the caret at the end, as in Notion. */}
          {editor && editable && (
            <div
              className="doc-tail"
              aria-hidden
              onMouseDown={(e) => {
                e.preventDefault();
                editor.commands.focus('end');
              }}
            />
          )}
        </div>
      </div>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} docId={doc._id} docTitle={title || 'Untitled'} />
      <CoverPicker
        show={coverOpen}
        onClose={() => setCoverOpen(false)}
        currentCover={cover}
        onSelect={(url) => {
          changeCover(url);
          setCoverOpen(false);
        }}
      />
      <ImageUploadDialog
        open={imageOpen}
        onOpenChange={setImageOpen}
        onImageUpload={(url) => {
          editor?.chain().focus().insertContent({ type: 'resizableImage', attrs: { src: url } }).run();
          setImageOpen(false);
        }}
      />
      <RcConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this doc?"
        body="It leaves Docs for everyone it is shared with. Its revision history stays."
        confirmLabel="Delete doc"
        danger
        busy={deleting}
        onConfirm={deleteDoc}
      />
    </div>
  );
}
