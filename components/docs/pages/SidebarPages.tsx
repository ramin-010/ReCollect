'use client';

/**
 * The sidebar's "Pages" tab (DOC_PAGES_PLAN §4.4, N3): the tree the open page is in, the root first. Rows of 28 px,
 * indented 14 px a level; a row with pages has a chevron; the open page has the nav's active background. The branches
 * above the open page start open; what else is open is kept per tree (localStorage). The owner's row hover: "+" makes a
 * page inside and opens it, "···" moves it (to another doc, up, down), copies its link or moves it to the trash.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronRight, FileText, Files, FolderInput, Link2, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcMenu } from '@/components/rc-ui';
import { docApi, type DocTreeNode } from '@/lib/api/docApi';
import { useDocTreeStore } from '@/lib/store/docTreeStore';
import { childrenOf, insideOf, pathOf, siblingsOf, visibleRows } from '@/lib/docs/tree';
import { MoveDocDialog } from './MoveDocDialog';

const KEY = (rootId: string) => `rc-doc-tree:${rootId}`;

function readOpen(rootId: string): string[] {
  try {
    const raw = window.localStorage.getItem(KEY(rootId));
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeOpen(rootId: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(KEY(rootId), JSON.stringify([...ids]));
  } catch {
    // A private window: open rows last for the visit only.
  }
}

const titleOf = (n: { title?: string | null }) => n.title?.trim() || 'Untitled';

/** DOC_PAGES_PLAN §8.1: where a dragged page would land: before or after a row, or inside it. */
type DropAt = { targetId: string; where: 'before' | 'after' | 'inside' };
/** How far the pointer moves before a press becomes a drag (a click stays a click). */
const DRAG_START_PX = 5;

export function SidebarPages({ docId, onNavigate }: { docId: string; onNavigate: () => void }) {
  const router = useRouter();
  const { rootId, nodes, canManage, refresh } = useDocTreeStore();
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [moving, setMoving] = useState<DocTreeNode | null>(null);
  // §8.1: drag a page to another place in the tree (the owner's). A line between rows: among those pages; a
  // highlighted row: inside that page. Pointer events, no package (the editor's block drag is the house pattern).
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<DropAt | null>(null);
  const press = useRef<{ id: string; x: number; y: number; active: boolean } | null>(null);
  const dropRef = useRef<DropAt | null>(null);

  // The saved open rows of this tree, plus the branches above the open page.
  useEffect(() => {
    if (!rootId) return;
    setOpen(new Set([...readOpen(rootId), rootId, ...pathOf(nodes, docId).map((n) => n._id)]));
  }, [rootId, docId, nodes]);

  const toggle = (id: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (rootId) writeOpen(rootId, next);
      return next;
    });

  const root = nodes.find((n) => n._id === rootId);
  const rows = useMemo(() => (root ? visibleRows(nodes, [root], open) : []), [nodes, root, open]);
  const kids = useMemo(() => childrenOf(nodes), [nodes]);

  const addInside = async (parent: DocTreeNode) => {
    try {
      const made = await docApi.createDoc({ title: 'Untitled', parentId: parent._id });
      if (!made.data?._id) throw new Error('no id');
      onNavigate();
      router.push(`/docs/${made.data._id}?new=1`);
    } catch {
      toast.error('The page was not made. Try again.');
    }
  };

  const copyLink = async (n: DocTreeNode) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/docs/${n._id}`);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  /** Up or down one place among its siblings (`after` the one two above, or the one below). */
  const shift = async (n: DocTreeNode, by: -1 | 1) => {
    const sibs = siblingsOf(nodes, n._id);
    const i = sibs.findIndex((s) => s._id === n._id);
    const after = by === -1 ? (i >= 2 ? sibs[i - 2]!._id : 'start') : sibs[i + 1]?._id;
    if (!after || (by === -1 && i === 0)) return;
    try {
      await docApi.moveDoc(n._id, { after });
      await refresh();
    } catch {
      toast.error('It did not move. Try again.');
    }
  };

  /** Where the pointer would drop the dragged page, or null (itself, inside itself, beside the root). */
  const dropUnder = (x: number, y: number, dragId: string): DropAt | null => {
    const row = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-tree-row]');
    const targetId = row?.dataset['treeRow'];
    if (!row || !targetId || targetId === dragId || insideOf(nodes, dragId).has(targetId)) return null;
    const box = row.getBoundingClientRect();
    const edge = box.height * 0.28;
    const isRoot = targetId === rootId;
    const where: DropAt['where'] = isRoot ? 'inside' : y < box.top + edge ? 'before' : y > box.bottom - edge ? 'after' : 'inside';
    return { targetId, where };
  };

  const dropTo = async (dragId: string, at: DropAt) => {
    const target = nodes.find((n) => n._id === at.targetId);
    const dragged = nodes.find((n) => n._id === dragId);
    if (!target || !dragged) return;
    let to: { parentId: string | null; after?: string };
    if (at.where === 'inside') to = { parentId: target._id };
    else {
      const sibs = siblingsOf(nodes, target._id).filter((s) => s._id !== dragId);
      const i = sibs.findIndex((s) => s._id === target._id);
      to = { parentId: target.parentId ?? null, after: at.where === 'after' ? target._id : i > 0 ? sibs[i - 1]!._id : 'start' };
    }
    try {
      await docApi.moveDoc(dragId, to);
      if (at.where === 'inside')
        setOpen((cur) => {
          const next = new Set(cur).add(target._id);
          if (rootId) writeOpen(rootId, next);
          return next;
        });
      await refresh();
      toast.success(at.where === 'inside' ? `Moved “${titleOf(dragged)}” into “${titleOf(target)}”` : `Moved “${titleOf(dragged)}”`);
    } catch (err) {
      const said = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(said ?? 'It did not move. Try again.');
    }
  };

  const startPress = (e: React.PointerEvent, id: string) => {
    if (!canManage || e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    press.current = { id, x: e.clientX, y: e.clientY, active: false };
    const move = (ev: PointerEvent) => {
      const p = press.current;
      if (!p) return;
      if (!p.active) {
        if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < DRAG_START_PX) return;
        p.active = true;
        setDragging(p.id);
      }
      ev.preventDefault();
      const at = dropUnder(ev.clientX, ev.clientY, p.id);
      dropRef.current = at;
      setDropAt(at);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const p = press.current;
      const at = dropRef.current;
      press.current = null;
      dropRef.current = null;
      setDragging(null);
      setDropAt(null);
      if (!p?.active) return;
      // The click that follows a drag never opens the row.
      const swallow = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 300);
      if (at) void dropTo(p.id, at);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const trash = async (n: DocTreeNode) => {
    const parent = n.parentId;
    const withOpen = n._id === docId || insideOf(nodes, n._id).has(docId);
    try {
      const done = await docApi.trashDoc(n._id);
      const words = done.pages ? ` with ${done.pages} ${done.pages === 1 ? 'page' : 'pages'} inside` : '';
      toast.success(`Moved “${titleOf(n)}” to the trash${words}`, {
        action: { label: 'Undo', onClick: () => void docApi.restoreDoc(n._id).then(() => refresh()) },
      });
      // The open page went with it: go to the doc it was in.
      if (withOpen) router.push(parent ? `/docs/${parent}` : '/docs');
      else await refresh();
    } catch {
      toast.error('It did not move to the trash. Try again.');
    }
  };

  if (!root) return null;
  return (
    <>
      <ul className="mt-1 flex flex-col gap-px" aria-label="Pages in this tree">
        {rows.map(({ node, depth }) => {
          const hasKids = (kids.get(node._id)?.length ?? 0) > 0;
          const isOpen = open.has(node._id);
          const here = node._id === docId;
          const sibs = node.parentId ? siblingsOf(nodes, node._id) : [];
          const at = sibs.findIndex((s) => s._id === node._id);
          const Glyph = hasKids ? Files : FileText;
          return (
            <li key={node._id} className="group/pg relative">
              <div
                data-tree-row={node._id}
                onPointerDown={(e) => startPress(e, node._id)}
                className={cn(
                  'flex h-[28px] items-center gap-1 rounded-[6px] pr-1 text-[14px] leading-none transition-colors duration-100',
                  here ? 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]' : 'hover:bg-[var(--ui-hover)]',
                  dragging === node._id && 'opacity-50',
                  dropAt?.targetId === node._id && dropAt.where === 'inside' && 'bg-[var(--ui-selected)] ring-2 ring-inset ring-[var(--ui-accent-fill)]',
                )}
                style={{
                  paddingLeft: 2 + depth * 14,
                  ...(dropAt?.targetId === node._id && dropAt.where !== 'inside'
                    ? { boxShadow: `inset 0 ${dropAt.where === 'before' ? '2px' : '-2px'} 0 var(--ui-accent-fill)` }
                    : {}),
                  ...(dragging ? { cursor: 'grabbing' } : {}),
                }}
              >
                {hasKids ? (
                  <button
                    type="button"
                    aria-label={isOpen ? `Close ${titleOf(node)}` : `Open ${titleOf(node)}`}
                    aria-expanded={isOpen}
                    onClick={() => toggle(node._id)}
                    className="grid h-[20px] w-[20px] shrink-0 place-items-center rounded-[4px] text-[var(--ui-icon)] hover:bg-[var(--ui-hover-strong,var(--ui-hover))]"
                  >
                    <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-100', isOpen && 'rotate-90')} strokeWidth={2} />
                  </button>
                ) : (
                  <span className="w-[20px] shrink-0" aria-hidden />
                )}
                <Link
                  href={`/docs/${node._id}`}
                  onClick={onNavigate}
                  draggable={false}
                  aria-current={here ? 'page' : undefined}
                  title={titleOf(node)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-fill)] rounded-[4px]"
                >
                  <Glyph className="h-4 w-4 shrink-0 text-[var(--ui-icon)]" strokeWidth={1.75} aria-hidden />
                  <span className={cn('ui-fade-end min-w-0 flex-1 py-1', !node.title?.trim() && 'text-[var(--ui-ink-3)]')}>{titleOf(node)}</span>
                </Link>
                {canManage && (
                  <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/pg:opacity-100 focus-within:opacity-100">
                    <RcMenu
                      label={`Options for ${titleOf(node)}`}
                      align="start"
                      actions={[
                        { label: 'Move to…', icon: <FolderInput className="h-4 w-4" />, onSelect: () => setMoving(node) },
                        ...(at > 0 ? [{ label: 'Move up', icon: <ArrowUp className="h-4 w-4" />, onSelect: () => void shift(node, -1) }] : []),
                        ...(at >= 0 && at < sibs.length - 1 ? [{ label: 'Move down', icon: <ArrowDown className="h-4 w-4" />, onSelect: () => void shift(node, 1) }] : []),
                        { label: 'Copy link', icon: <Link2 className="h-4 w-4" />, onSelect: () => void copyLink(node) },
                        { label: 'Move to trash', icon: <Trash2 className="h-4 w-4" />, onSelect: () => void trash(node), danger: true, separatorBefore: true },
                      ]}
                    >
                      <button type="button" aria-label={`Options for ${titleOf(node)}`} className="grid h-[22px] w-[22px] place-items-center rounded-[4px] text-[var(--ui-icon)] hover:bg-[var(--ui-hover-strong,var(--ui-hover))]">
                        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </RcMenu>
                    <button
                      type="button"
                      aria-label={`Add a page inside ${titleOf(node)}`}
                      title="Add a page inside"
                      onClick={() => void addInside(node)}
                      className="grid h-[22px] w-[22px] place-items-center rounded-[4px] text-[var(--ui-icon)] hover:bg-[var(--ui-hover-strong,var(--ui-hover))]"
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <MoveDocDialog
        open={!!moving}
        onOpenChange={(o) => !o && setMoving(null)}
        doc={moving ? { _id: moving._id, title: moving.title } : null}
        onMoved={() => void refresh()}
      />
    </>
  );
}
