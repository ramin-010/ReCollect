'use client';

import { EditorContent } from '@tiptap/react';
import dynamic from 'next/dynamic';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type * as Y from 'yjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FileDown, FilePlus2, FolderInput, ImagePlus, Link2, MoreHorizontal, PanelRight, RotateCcw, Trash2 } from 'lucide-react';
import { DocPages, useNewPage, type PageRow } from '@/components/docs/pages/DocPages';
import { MoveDocDialog } from '@/components/docs/pages/MoveDocDialog';
import { PageFooterNav } from '@/components/docs/pages/PageFooterNav';
import { useDocTreeStore } from '@/lib/store/docTreeStore';
import { childrenOf } from '@/lib/docs/tree';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcConfirm, RcIconButton, RcMenu, RcSheet, RcSkel } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';
import { EditCaptureDialog } from '@/components/learning/EditCaptureDialog';
import { useAuthStore } from '@/lib/store/authStore';
import { useDocStore, type Doc } from '@/lib/store/docStore';
import { useTopBar } from '@/lib/store/topBarStore';
import { docApi } from '@/lib/api/docApi';
import { agentApi } from '@/lib/api/agentApi';
import { trackVisit } from '@/lib/services/recentVisits';
import { useCollaboration } from '@/components/docs/doc_editor/useCollaboration';
import { CoverPicker } from '@/components/docs/doc_editor/CoverPicker';
import { SharePopover } from './SharePopover';
import { useLiveDocEditor } from '@/components/docs/editor/useLiveDocEditor';
import { DocProperties } from './DocProperties';
import { DocNotes, isOnPage, useNotes, type NotesPlace } from './DocNotes';
import type { DocEditor } from '@/lib/blocks/schema';
import '@/components/docs/editor/doc-editor.css';

const CARET_COLORS = ['#2383e2', '#d9730d', '#0f7b6c', '#9065b0', '#c14c8a', '#dfab01', '#e03e3e', '#64473a'];

/** The doc's editor (BlockNote, the "blocks" fragment; DOCS_EDITOR_V2_PLAN). Client only. */
/** The notes panel: open or closed, per browser (STUDY_FLOW_PLAN §4.3). */
const NOTES_KEY = 'rc-doc-notes';
/** Below this page width the panel opens as a sheet (the doc's column keeps at least ~760 px beside 320). */
const NOTES_BESIDE_MIN = 1080;
/** Its width (drag its left edge; double-click puts it back), kept per browser. */
const NOTES_W_KEY = 'rc-doc-notes-w';
/** Fits the empty space beside the doc's column on a 1,536 screen with the app's sidebar open: the doc doesn't move. */
const NOTES_W_DEFAULT = 276;
const NOTES_W_MIN = 240;
const NOTES_W_MAX = 640;

/**
 * How far the doc's column moves for the open panel (his ask): not at all while the panel fits in the empty space
 * beside the column; only as much as a wider panel (or a narrower page) needs. The panel lies over the page's right
 * margin; the page gets right padding twice the overlap, so its centred column moves left by the overlap.
 */
function docShift(pageW: number, panelW: number): number {
  if (!pageW || !panelW) return 0;
  const column = Math.min(912, pageW);
  const pad = pageW <= 1024 ? 48 : 96;
  const textRight = pageW / 2 + column / 2 - pad;
  const overlap = textRight - (pageW - panelW);
  // Every pixel wider than the default moves the column with it (his ask), and it never sits under the panel.
  const wider = Math.max(0, panelW - NOTES_W_DEFAULT);
  return Math.max(0, Math.round(Math.max(overlap * 2, wider)));
}

const LabEditor = dynamic(() => import('@/components/docs/v2/LabEditor').then((m) => m.LabEditor), { ssr: false });

/** What the page asks of the body, whichever editor draws it: the title's Enter and ↓, and "is it empty". */
interface BodyApi {
  /** Enter in the title: a new first line holding `tail` (the title's text after the caret), the caret in it. */
  enterFromTitle(tail: string): void;
  /** ↓ at the end of the title: the caret at the start of the body. */
  focusStart(): void;
  isEmpty(): boolean;
}

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
/** DOC_PAGES_PLAN: where a doc sits in a tree (fields of GET /api/docs/:id; an older server sends none). */
function treeOf(doc: unknown): { trail: Array<{ _id: string; title: string }>; pages: PageRow[] } {
  const d = doc as { trail?: Array<{ _id: string; title: string }>; pages?: PageRow[] };
  return { trail: d.trail ?? [], pages: d.pages ?? [] };
}

/** The trail's crumbs: every doc above when there are two or fewer, else the root, "…" (the one above the parent), the parent. */
function trailCrumbs(trail: Array<{ _id: string; title: string }>): Array<{ label: string; href: string }> {
  const crumb = (t: { _id: string; title: string }) => ({ label: t.title.trim() || 'Untitled', href: `/docs/${t._id}` });
  if (trail.length <= 2) return trail.map(crumb);
  return [crumb(trail[0]!), { label: '…', href: `/docs/${trail[trail.length - 2]!._id}` }, crumb(trail[trail.length - 1]!)];
}

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
        else setDoc((prev) => ({ ...(prev ?? {}), ...(d as unknown as Doc) }));
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

  const { ydoc, provider, collaborators, connect, disconnect, wasRemovedByOwner, readOnly: liveReadOnly } = useCollaboration({
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

  // The server says the role (GET /api/docs/:id); never assume the owner's rights.
  const role: Role = (doc?.role as Role | undefined) ?? 'viewer';

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
      role={liveReadOnly && role === 'editor' ? 'viewer' : role}
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
  // The new editor draws the body; ?editor=v1 shows the old one, read-only, for a while after the switch.
  const oldEditor = useSearchParams().get('editor') === 'v1';
  const [body, setBody] = useState<BodyApi | null>(null);
  const updateStoreDoc = useDocStore((s) => s.updateDoc);
  const removeStoreDoc = useDocStore((s) => s.removeDoc);
  const setTopBar = useTopBar((s) => s.setTopBar);
  const clearTopBar = useTopBar((s) => s.clearTopBar);
  const meta = useMemo(() => ydoc.getMap('metadata'), [ydoc]);
  // A doc just made from "New doc" (?new=1) starts with an empty title: the placeholder says
  // "Untitled" and the caret waits there, so typing names it (the server's default stays until then).
  const isNewDoc = useSearchParams().get('new') === '1' && (doc.title ?? '') === 'Untitled';
  const [title, setTitle] = useState<string>(() => (meta.get('title') as string | undefined) ?? (isNewDoc ? '' : doc.title ?? ''));
  const [cover, setCover] = useState<string | null>(() => (meta.get('coverImage') as string | null | undefined) ?? doc.coverImage ?? null);
  const [synced, setSynced] = useState(provider.isSynced);
  const [coverOpen, setCoverOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // In the trash: the bar at the top says so (Restore, Delete for good); the doc still opens.
  const [trashedAt, setTrashedAt] = useState<string | null>(doc.trashedAt ?? null);
  // DOC_PAGES_PLAN §4.8: a page that went to the trash with a doc above it says which.
  const trashedWithId = (doc as { trashedWithId?: string | null }).trashedWithId ?? null;
  const [deleting, setDeleting] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The title and cover live in the doc's Y.Map so every tab (and an agent) sees them live; the server copies them to the row.
  useEffect(() => {
    const onSync = () => {
      setSynced(true);
      if (isOwner && meta.get('title') === undefined) {
        ydoc.transact(() => {
          meta.set('title', isNewDoc ? '' : doc.title || '');
          meta.set('coverImage', doc.coverImage ?? null);
        });
      }
    };
    if (provider.isSynced) onSync();
    provider.on('synced', onSync);
    return () => {
      provider.off('synced', onSync);
    };
  }, [provider, meta, ydoc, isOwner, isNewDoc, doc.title, doc.coverImage]);

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

  const renameInTree = useDocTreeStore((s) => s.rename);
  const changeTitle = (value: string) => {
    const v = value.replace(/\n/g, ' ');
    setTitle(v);
    meta.set('title', v);
    updateStoreDoc(doc._id, { title: v });
    // DOC_PAGES_PLAN §4.4: the sidebar's tree follows the typing.
    renameInTree(doc._id, v);
  };

  // The sidebar's Recent list follows a renamed doc (it keeps the title from the visit otherwise).
  useEffect(() => {
    const t = title.trim();
    if (!t) return;
    const timer = setTimeout(() => trackVisit({ itemId: doc._id, itemType: 'doc', title: t, route: `/docs/${doc._id}` }), 1500);
    return () => clearTimeout(timer);
  }, [title, doc._id]);

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

  // A template is filled in when the doc is made (POST /api/docs with its content), as blocks.
  const params = useSearchParams();
  const router = useRouter();
  // DOC_PAGES_PLAN §4.2-4.3: the docs above this one (the trail) and the pages inside it, from GET /api/docs/:id.
  const tree = useMemo(() => treeOf(doc), [doc]);
  const trashedWithTitle = trashedWithId ? useDocStore.getState().docs.find((d) => d._id === trashedWithId)?.title?.trim() : undefined;
  const trashedWith = trashedWithId ? (trashedWithTitle ? `“${trashedWithTitle}”` : 'the doc it was in') : null;
  const { make: makePage } = useNewPage(doc._id);
  // §4.4: the tree this page is in, for the sidebar's Pages tab and previous/next.
  const loadTree = useDocTreeStore((s) => s.load);
  const refreshTree = useDocTreeStore((s) => s.refresh);
  useEffect(() => {
    void loadTree(doc._id, isOwner);
  }, [doc._id, isOwner, loadTree]);
  // §4.7: "Move to…" from the ··· menu.
  const [moveOpen, setMoveOpen] = useState(false);
  // §5: the pages that have a block in the text (live from the editor).
  const [blockPages, setBlockPages] = useState<string[]>([]);
  // §4.2: under 640 px the trail is one link, "‹ Parent" (the page's own title is right below it).
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const read = () => setNarrow(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);
  // The pages inside it follow the tree store once it has this doc (a move, a new page or the trash from the sidebar
  // shows at once); until then, the server's list from GET /api/docs/:id.
  const treeNodes = useDocTreeStore((s) => (s.docId === doc._id && s.nodes.length ? s.nodes : null));
  const livePages = useMemo<PageRow[]>(() => {
    if (!treeNodes) return tree.pages;
    const kids = childrenOf(treeNodes);
    return (kids.get(doc._id) ?? []).map((n) => ({ _id: n._id, title: n.title, pages: kids.get(n._id)?.length ?? 0 }));
  }, [treeNodes, tree.pages, doc._id]);
  // §4.8: Ctrl+Shift+U opens the doc above (Notion's key); not at the top level, not from a field outside the editor.
  const parentId = (doc as { parentId?: string | null }).parentId ?? null;
  useEffect(() => {
    if (!parentId) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.key.toLowerCase() !== 'u') return;
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && !t.closest('.doc-column');
      if (inField) return;
      e.preventDefault();
      router.push(`/docs/${parentId}`);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [parentId, router]);
  // ?share=1 (a request's notification or email) opens the Share popover once; the address drops it.
  const [shareAtStart] = useState(() => params.get('share') === '1');
  useEffect(() => {
    if (!shareAtStart) return;
    const next = new URLSearchParams(params.toString());
    next.delete('share');
    const q = next.toString();
    router.replace(`/docs/${doc._id}${q ? `?${q}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);
  // An empty new doc starts in the title; otherwise focus stays where the reader puts it.
  useEffect(() => {
    if (editable && synced && !title && body?.isEmpty()) titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, after the first sync
  }, [synced, body]);

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
      toast.success('Deleted for good');
      onDeleted();
    } catch {
      toast.error('The doc was not deleted. Try again.');
      setDeleting(false);
    }
  };

  const moveToTrash = useCallback(async () => {
    const at = new Date().toISOString();
    setTrashedAt(at);
    try {
      const done = await docApi.trashDoc(doc._id);
      void refreshTree();
      // DOC_PAGES_PLAN §4.8: the pages inside it went with it.
      toast(done.pages ? `Moved to the trash with ${done.pages} ${done.pages === 1 ? 'page' : 'pages'} inside` : 'Moved to the trash', {
        description: 'Deleted for good after 30 days.',
        action: {
          label: 'Undo',
          onClick: () =>
            void docApi
              .restoreDoc(doc._id)
              .then(() => {
                setTrashedAt(null);
                void refreshTree();
              })
              .catch(() => toast.error('It did not come back. Try again.')),
        },
      });
    } catch {
      setTrashedAt(null);
      toast.error('It did not move to the trash. Try again.');
    }
  }, [doc._id, refreshTree]);

  const restore = async () => {
    const was = trashedAt;
    setTrashedAt(null);
    try {
      const back = await docApi.restoreDoc(doc._id);
      toast.success(back.detached ? 'Restored at the top level' : back.pages ? `Restored with ${back.pages} ${back.pages === 1 ? 'page' : 'pages'} inside` : 'Restored');
      void refreshTree();
    } catch {
      setTrashedAt(was);
      toast.error('It did not come back. Try again.');
    }
  };

  // STUDY_FLOW_PLAN §4.3: the lesson's notes and links in a right panel. Its toggle sits at the top bar's right end
  // (open or closed kept per browser, closed at first); beside the doc when the page has room, a sheet when not.
  const [notesPlace, setNotesPlace] = useState<NotesPlace | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([learningApi.getTopicByDoc(doc._id), learningApi.getSubjects()])
      .then(([t, subjects]) => {
        if (cancelled) return;
        // DOC_PAGES_PLAN D4: every page of a lesson has its notes panel (a page inside one: its lesson's).
        if (t.topic) {
          const subject = subjects.find((s) => s._id === t.topic!.subjectId);
          setNotesPlace({ topicId: t.topic._id, subjectId: t.topic.subjectId, subjectName: subject?.name ?? 'its subject', pageId: doc._id, lessonDocId: doc._id });
        } else if (t.lesson) {
          setNotesPlace({ topicId: t.lesson.topicId, subjectId: t.lesson.subjectId, subjectName: t.lesson.subjectName || 'its subject', pageId: doc._id, lessonDocId: t.lesson.docId, lessonTitle: t.lesson.title });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [doc._id]);
  const [notesOpen, setNotesOpen] = useState(false);
  useEffect(() => {
    try {
      setNotesOpen(window.localStorage.getItem(NOTES_KEY) === '1');
    } catch {
      /* no storage: closed */
    }
  }, []);
  const toggleNotes = useCallback((open: boolean) => {
    setNotesOpen(open);
    try {
      window.localStorage.setItem(NOTES_KEY, open ? '1' : '0');
    } catch {
      /* kept for this visit only */
    }
  }, []);
  const splitRef = useRef<HTMLDivElement>(null);
  const [roomy, setRoomy] = useState(true);
  const [pageW, setPageW] = useState(0);
  useLayoutEffect(() => {
    const el = splitRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      setPageW(w);
      setRoomy(w >= NOTES_BESIDE_MIN);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const notes = useNotes(notesPlace, notesOpen);
  // Its width: its left edge drags it wider or narrower (his ask), kept per browser; never so wide the doc gets cramped.
  const [sideW, setSideW] = useState(NOTES_W_DEFAULT);
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    try {
      const w = Number(window.localStorage.getItem(NOTES_W_KEY));
      if (w >= NOTES_W_MIN && w <= NOTES_W_MAX) setSideW(w);
    } catch {
      /* the default width */
    }
  }, []);
  const clampW = useCallback((w: number) => {
    const room = (splitRef.current?.getBoundingClientRect().width ?? 1400) - 640;
    return Math.round(Math.max(NOTES_W_MIN, Math.min(NOTES_W_MAX, room, w)));
  }, []);
  const keepW = (w: number) => {
    try {
      window.localStorage.setItem(NOTES_W_KEY, String(w));
    } catch {
      /* kept for this visit only */
    }
  };
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const grip = e.currentTarget;
    grip.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const w0 = sideW;
    let w = w0;
    setResizing(true);
    const move = (ev: PointerEvent) => {
      w = clampW(w0 + (x0 - ev.clientX));
      setSideW(w);
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      setResizing(false);
      keepW(w);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  };
  const resizeByKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const w = clampW(sideW + (e.key === 'ArrowLeft' ? 24 : -24));
    setSideW(w);
    keepW(w);
  };
  // On a page inside a lesson the count is this page's notes; on the lesson, the lesson's.
  const notesCount = notesPlace && notesPlace.pageId !== notesPlace.lessonDocId ? (notes.lesson ?? []).filter((n) => isOnPage(notesPlace, n)).length : notes.lesson?.length ?? 0;

  // Fill the top bar: breadcrumb and the page's actions.
  useEffect(() => {
    setTopBar({
      // DOC_PAGES_PLAN §4.2: Docs / A / … / Parent / This page (the docs above it the user can open).
      crumbs:
        narrow && tree.trail.length
          ? [{ label: `‹ ${tree.trail[tree.trail.length - 1]!.title.trim() || 'Untitled'}`, href: `/docs/${tree.trail[tree.trail.length - 1]!._id}` }]
          : [{ label: 'Docs', href: '/docs' }, ...trailCrumbs(tree.trail), { label: title.trim() || 'Untitled' }],
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
          <SharePopover docId={doc._id} isOwner={isOwner} meId={me.id === 'guest' ? null : me.id} openAtStart={shareAtStart} />
          <RcMenu
            label="Doc options"
            actions={[
              { label: 'Copy link', icon: <Link2 className="h-4 w-4" strokeWidth={1.75} />, onSelect: copyLink },
              { label: 'Copy as Markdown', icon: <FileDown className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => void copyMarkdown() },
              ...(editable ? [{ label: cover ? 'Change cover' : 'Add cover', icon: <ImagePlus className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => setCoverOpen(true) }] : []),
              // DOC_PAGES_PLAN §4.3: a page inside this doc (the owner's).
              ...(isOwner && !trashedAt ? [{ label: 'Add a page inside', icon: <FilePlus2 className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => void makePage() }] : []),
              ...(isOwner && !trashedAt ? [{ label: 'Move to…', icon: <FolderInput className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => setMoveOpen(true) }] : []),
              ...(isOwner && !trashedAt ? [{ label: 'Move to trash', icon: <Trash2 className="h-4 w-4" strokeWidth={1.75} />, onSelect: () => void moveToTrash(), danger: true, separatorBefore: true }] : []),
            ]}
          >
            <RcIconButton label="Doc options" size="sm">
              <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </RcIconButton>
          </RcMenu>
          {notesPlace && (
            <RcIconButton
              size="sm"
              label={notesOpen ? 'Hide notes and links' : 'Show notes and links'}
              aria-pressed={notesOpen}
              className="rc-panel-toggle doc-side-toggle"
              onClick={() => toggleNotes(!notesOpen)}
            >
              <PanelRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {notesCount > 0 && <span className="doc-side-count">{notesCount}</span>}
            </RcIconButton>
          )}
        </div>
      ),
    });
  }, [setTopBar, title, synced, others.length, isOwner, editable, cover, copyLink, copyMarkdown, others, trashedAt, moveToTrash, doc._id, me.id, shareAtStart, notesPlace, notesOpen, notesCount, toggleNotes, tree.trail, makePage, narrow]);

  useEffect(() => () => clearTopBar(), [clearTopBar]);

  return (
    <div ref={splitRef} className={cn(rcScope, 'doc-split')}>
    <div ref={scrollRef} className={cn(rcScope, 'doc-page')} style={notesPlace && roomy ? { paddingRight: docShift(pageW, notesOpen ? sideW : 0) } : undefined}>
      {trashedAt && (
        <div className="doc-trash-bar" role="status">
          <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <p className="min-w-0 flex-1">
            {!isOwner
              ? 'The owner moved this doc to the trash.'
              : trashedWith
                ? `In the trash with ${trashedWith}. Restore brings this page back on its own, at the top level.`
                : `In the trash. It is deleted for good on ${new Date(new Date(trashedAt).getTime() + 30 * 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.`}
          </p>
          {isOwner && (
            <>
              <RcButton size="sm" variant="outline" icon={<RotateCcw className="h-4 w-4" strokeWidth={1.75} />} onClick={() => void restore()}>
                Restore
              </RcButton>
              <RcButton size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete for good
              </RcButton>
            </>
          )}
        </div>
      )}
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
          readOnly={!editable || !!trashedAt}
          onChange={(e) => changeTitle(e.target.value)}
          onKeyDown={(e) => {
            if (!body) return;
            const el = e.currentTarget;
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              // As in Notion: Enter starts a new first line (taking any text after the caret with
              // it), unless the body already starts with an empty one. Focus moves synchronously, so
              // the very next keystroke lands in the body, not the title.
              e.preventDefault();
              const at = el.selectionStart ?? el.value.length;
              const tail = el.value.slice(at);
              if (tail) changeTitle(el.value.slice(0, at).trimEnd());
              body.enterFromTitle(tail.trim());
            } else if (e.key === 'ArrowDown' && el.selectionStart === el.value.length) {
              e.preventDefault();
              body.focusStart();
            }
          }}
        />

        <DocProperties docId={doc._id} docTitle={title} updatedAt={doc.updatedAt} editable={editable} />

        {/* The switch (DOCS_EDITOR_V2_PLAN phase 4, 2026-11-15): the new editor edits the doc's "blocks"
            fragment; the old one shows its frozen copy ("default"), read-only, behind ?editor=v1. */}
        {oldEditor ? (
          <OldBody ydoc={ydoc} provider={provider} user={{ name: me.name, color: me.color }} docId={doc._id} onReady={setBody} />
        ) : (
          <NewBody
            ydoc={ydoc}
            provider={provider}
            user={{ name: me.name, color: me.color }}
            docId={doc._id}
            editable={editable && !trashedAt}
            onReady={setBody}
            canAddPages={isOwner && !trashedAt}
            onPages={setBlockPages}
          />
        )}
        {/* §5: a page that has a block in the text is not repeated here. */}
        <DocPages docId={doc._id} pages={livePages.filter((p) => !blockPages.includes(p._id))} isOwner={isOwner && !trashedAt} />
        {!trashedAt && <PageFooterNav docId={doc._id} />}
      </div>
      <MoveDocDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        doc={{ _id: doc._id, title: title.trim() || 'Untitled' }}
        onMoved={() => {
          void refreshTree();
          router.refresh();
        }}
      />

      <CoverPicker
        show={coverOpen}
        onClose={() => setCoverOpen(false)}
        currentCover={cover}
        onSelect={(url) => {
          changeCover(url);
          setCoverOpen(false);
        }}
      />
      <RcConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this doc for good?"
        body="It can't be brought back. It leaves Docs for everyone it is shared with; its revision history stays."
        confirmLabel="Delete for good"
        danger
        busy={deleting}
        onConfirm={deleteDoc}
      />
    </div>
    {notesPlace && roomy && (
      <aside
        className={cn('doc-side', notesOpen && 'doc-side--open', resizing && 'doc-side--resizing')}
        style={{ '--doc-side-w': `${sideW}px` } as React.CSSProperties}
        aria-label="Notes and links"
        aria-hidden={!notesOpen}
      >
        <div className="doc-side-inner">
          <div className="doc-side-frame">
          <div
            className="doc-side-grip"
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag to widen or narrow the notes"
            aria-valuenow={sideW}
            aria-valuemin={NOTES_W_MIN}
            aria-valuemax={NOTES_W_MAX}
            tabIndex={notesOpen ? 0 : -1}
            data-dragging={resizing ? '' : undefined}
            onPointerDown={startResize}
            onKeyDown={resizeByKey}
            onDoubleClick={() => {
              setSideW(NOTES_W_DEFAULT);
              keepW(NOTES_W_DEFAULT);
            }}
          />
          <div className="doc-side-card">
            <DocNotes place={notesPlace} lesson={notes.lesson} subject={notes.subject} failed={notes.failed} />
          </div>
          </div>
        </div>
      </aside>
    )}
    {notesPlace && !roomy && (
      <RcSheet open={notesOpen} onOpenChange={toggleNotes} title="Notes and links">
        <DocNotes place={notesPlace} lesson={notes.lesson} subject={notes.subject} failed={notes.failed} />
      </RcSheet>
    )}
    {notesPlace && <EditCaptureDialog />}
    </div>
  );
}

type BodyProps = {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  user: { name: string; color: string };
  docId: string;
  onReady: (api: BodyApi) => void;
  /** DOC_PAGES_PLAN §5: "/page" (the owner's) and the pages that have a block in the text. */
  canAddPages?: boolean;
  onPages?: (ids: string[]) => void;
};

/** The new editor (BlockNote) and what the title asks of it. */
function NewBody({ editable, onReady, ...rest }: BodyProps & { editable: boolean }) {
  const onEditor = useCallback(
    (ed: DocEditor) => {
      const isEmptyParagraph = (b: DocEditor['document'][number] | undefined) =>
        !!b && b.type === 'paragraph' && Array.isArray(b.content) && b.content.length === 0 && b.children.length === 0;
      onReady({
        enterFromTitle(tail) {
          const first = ed.document[0];
          ed.focus();
          if (!first) return;
          if (!tail && isEmptyParagraph(first)) {
            ed.setTextCursorPosition(first, 'start');
            return;
          }
          const [made] = ed.insertBlocks([{ type: 'paragraph', content: tail } as never], first, 'before');
          if (made) ed.setTextCursorPosition(made, 'start');
        },
        focusStart() {
          const first = ed.document[0];
          ed.focus();
          if (first) ed.setTextCursorPosition(first, 'start');
        },
        isEmpty() {
          const d = ed.document;
          return d.length === 0 || (d.length === 1 && isEmptyParagraph(d[0]));
        },
      });
    },
    [onReady],
  );
  return (
    <div className="doc-body doc-body-v2">
      <LabEditor ydoc={rest.ydoc} provider={rest.provider} user={rest.user} editable={editable} docId={rest.docId} onEditor={onEditor} canAddPages={rest.canAddPages ?? false} {...(rest.onPages ? { onPages: rest.onPages } : {})} />
    </div>
  );
}

/** The old editor (TipTap, the "default" fragment), read-only since the switch: what the doc held before it. */
function OldBody({ ydoc, provider, user, docId, onReady }: BodyProps) {
  const editor = useLiveDocEditor({ ydoc, provider, user, docId, editable: false });
  useEffect(() => {
    if (!editor) return;
    onReady({
      enterFromTitle: () => editor.commands.focus('start'),
      focusStart: () => editor.commands.focus('start'),
      isEmpty: () => editor.isEmpty,
    });
  }, [editor, onReady]);
  return (
    <div className="doc-body">
      <p className="doc-old-note">
        The old editor, read-only: the doc as it was when it moved to the new editor (15 Nov 2026). <a href={`/docs/${docId}`}>Open it in the new editor</a>.
      </p>
      <EditorContent editor={editor} />
    </div>
  );
}
