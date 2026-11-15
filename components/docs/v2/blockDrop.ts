'use client';

/**
 * Notion's drop rules for blocks dragged by the grip (NB-09 to NB-11, context/research/
 * notion-editor-behaviour.md), on BlockNote's own API so the doc stays valid (DOCS_EDITOR_V2_PLAN
 * §4.2):
 * - the row under the pointer picks the block; its upper half drops above it, its lower half below;
 * - over the lower half of a list item or toggle, a pointer right of its text start nests the block
 *   as its child: the line moves in to where the child will sit and the future parent is tinted;
 *   a parent whose children show below it always takes the block as its first child there;
 * - over the lower half of the last block in a nested list, a pointer left of that block's edge
 *   drops it after the parent instead (the reverse of nesting).
 * BlockNote draws the sibling line (its drop cursor, through the `computeDropPosition` hook); the
 * nesting line and the parent's tint are ours. The move itself is one `editor.transact`.
 */
import { createExtension } from '@blocknote/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

export type DropPlacement = 'before' | 'after' | 'child';
export type DropIntent = { targetId: string; placement: DropPlacement };

/** Blocks a drag can nest under by its horizontal offset (Notion: list items and toggles, not paragraphs). */
const NESTABLE = new Set(['bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem']);
/** How far right of a block's left edge its text starts when its DOM can't say (one nesting step). */
const NEST_STEP = 32;

type BlockApi = {
  getBlock: (id: string) => { id: string; children: { id: string }[] } | undefined;
  removeBlocks: (ids: string[]) => void;
  insertBlocks: (blocks: unknown[], ref: string, placement: 'before' | 'after') => void;
  updateBlock: (ref: string, update: { children: unknown[] }) => void;
  transact: <T>(fn: () => T) => T;
};

const tintKey = new PluginKey<number | null>('rc-nest-tint');

/** The position and node of a block by its id, or null. */
function findBlock(doc: PMNode, id: string): { pos: number; node: PMNode } | null {
  let found: { pos: number; node: PMNode } | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.isInGroup('bnBlock') && node.attrs.id === id) {
      found = { pos, node };
      return false;
    }
    return true;
  });
  return found;
}

/** The outermost blocks in the current selection (BlockNote selects the dragged blocks on drag start). */
function selectedBlockIds(state: EditorState): string[] {
  const { from, to } = state.selection;
  const ids: string[] = [];
  state.doc.nodesBetween(from, to, (node) => {
    if (node.type.isInGroup('bnBlock')) {
      if (node.attrs.id) ids.push(String(node.attrs.id));
      return false;
    }
    return true;
  });
  return ids;
}

/** A drag of whole blocks (BlockNote's side menu), not of text. */
function isBlockDrag(view: EditorView): boolean {
  const slice = view.dragging?.slice;
  if (!slice || slice.openStart > 0) return false;
  const first = slice.content.firstChild;
  return !!first && (first.type.isInGroup('bnBlock') || first.type.name === 'blockGroup');
}

const containerOf = (row: Element) => row.closest('[data-node-type="blockContainer"]') as HTMLElement | null;

/** Where a block dragged to (x, y) lands, by Notion's rules; null over the dragged blocks themselves. */
export function intentAt(view: EditorView, x: number, y: number, dragged: string[]): DropIntent | null {
  const rows = Array.from(view.dom.querySelectorAll<HTMLElement>('.bn-block-content'))
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter((r) => r.rect.height > 0);
  if (!rows.length) return null;
  // The row under the pointer, else the nearest one above or below it.
  let hit = rows.find((r) => y >= r.rect.top && y < r.rect.bottom);
  if (!hit) {
    let best = Infinity;
    for (const r of rows) {
      const d = y < r.rect.top ? r.rect.top - y : y - r.rect.bottom;
      if (d < best) {
        best = d;
        hit = r;
      }
    }
  }
  if (!hit) return null;
  const container = containerOf(hit.el);
  const id = container?.getAttribute('data-id');
  if (!container || !id) return null;
  // Over one of the dragged blocks (or inside one): no drop.
  for (const d of dragged) {
    const el = view.dom.querySelector(`[data-node-type="blockContainer"][data-id="${CSS.escape(d)}"]`);
    if (el && (el === container || el.contains(container))) return null;
  }
  const { rect } = hit;
  if (y < rect.top + rect.height / 2) return { targetId: id, placement: 'before' };

  const type = hit.el.getAttribute('data-content-type') ?? '';
  const textLeft = hit.el.querySelector('.bn-inline-content')?.getBoundingClientRect().left ?? rect.left + NEST_STEP;
  const kids = Array.from(container.querySelectorAll(':scope > .bn-block-group > .bn-block-outer, :scope > .bn-block-group > [data-node-type="blockContainer"]'));
  const kidsShow = kids.some((k) => (k as HTMLElement).getBoundingClientRect().height > 0);
  if (kidsShow) return { targetId: id, placement: 'child' };
  if (NESTABLE.has(type) && x >= textLeft) return { targetId: id, placement: 'child' };

  // The reverse of nesting: at the end of a nested list, a pointer left of the block's edge drops after its parent.
  let target = container;
  for (;;) {
    const group = target.parentElement?.closest('.bn-block-group');
    const parent = group?.parentElement?.closest('[data-node-type="blockContainer"]') as HTMLElement | null;
    if (!group || !parent || !view.dom.contains(parent)) break;
    const siblings = Array.from(group.children);
    const own = siblings.find((s) => s === target || s.contains(target));
    const isLast = own === siblings[siblings.length - 1];
    if (!isLast || x >= target.getBoundingClientRect().left) break;
    target = parent;
  }
  return { targetId: target.getAttribute('data-id') ?? id, placement: 'after' };
}

/** Moves the dragged blocks to the intent's place, as one change (one Undo step). */
export function applyIntent(editor: BlockApi, dragged: string[], intent: DropIntent) {
  editor.transact(() => {
    const blocks = dragged.map((id) => editor.getBlock(id)).filter(Boolean);
    if (!blocks.length) return;
    editor.removeBlocks(dragged);
    const target = editor.getBlock(intent.targetId);
    if (!target) throw new Error('The drop target is gone.');
    if (intent.placement === 'child') {
      if (target.children.length) editor.insertBlocks(blocks, target.children[0].id, 'before');
      else editor.updateBlock(target.id, { children: blocks });
    } else editor.insertBlocks(blocks, target.id, intent.placement);
  });
}

/**
 * One instance per editor: the extension (the tint, the drop) and the drop cursor's hook (the line).
 * Pass `hook` as `dropCursor.hooks.computeDropPosition` and `extension` in `extensions`.
 */
export function createBlockDrop() {
  let dragged: string[] | null = null; // the blocks of the drag in progress, read at its first dragover
  let intent: DropIntent | null = null;
  let line: HTMLDivElement | null = null;
  let viewRef: EditorView | null = null;

  const setTint = (view: EditorView, pos: number | null) => {
    if (tintKey.getState(view.state) !== pos) view.dispatch(view.state.tr.setMeta(tintKey, pos).setMeta('addToHistory', false));
  };
  const showLine = (rect: { left: number; right: number; y: number } | null) => {
    if (!rect) {
      if (line) line.style.display = 'none';
      return;
    }
    if (!line) {
      line = document.createElement('div');
      line.className = 'lab-nest-line';
      document.body.appendChild(line);
    }
    Object.assign(line.style, { display: 'block', left: `${rect.left}px`, top: `${rect.y - 2}px`, width: `${Math.max(0, rect.right - rect.left)}px` });
  };
  const clear = () => {
    intent = null;
    showLine(null);
    if (viewRef) setTint(viewRef, null);
  };
  const reset = () => {
    clear();
    dragged = null;
  };

  /** Shows where the block will land; BlockNote draws sibling lines, nesting is drawn here. */
  const hook = ({ view, event, defaultPosition }: { view: EditorView; event: DragEvent; defaultPosition: { pos: number; orientation: string } | null }) => {
    viewRef = view;
    if (!isBlockDrag(view)) return defaultPosition;
    if (!dragged) dragged = selectedBlockIds(view.state);
    if (!dragged.length) return defaultPosition;
    intent = intentAt(view, event.clientX, event.clientY, dragged);
    if (!intent) {
      clear();
      return null;
    }
    const found = findBlock(view.state.doc, intent.targetId);
    if (!found) {
      clear();
      return defaultPosition;
    }
    if (intent.placement === 'child') {
      const container = view.dom.querySelector(`[data-node-type="blockContainer"][data-id="${CSS.escape(intent.targetId)}"]`);
      // The block's own row comes first in its container (a toggle wraps it; its children follow).
      const row = container?.querySelector('.bn-block-content');
      if (row) {
        const r = row.getBoundingClientRect();
        // The line starts where the child will sit: one step in from the parent's edge.
        showLine({ left: r.left + NEST_STEP, right: r.right, y: r.bottom });
      }
      setTint(view, found.pos);
      return null;
    }
    showLine(null);
    setTint(view, null);
    return { pos: intent.placement === 'before' ? found.pos : found.pos + found.node.nodeSize, orientation: 'block-horizontal' };
  };

  const extension = createExtension(({ editor }: { editor: unknown }) => ({
    key: 'rc-block-drop',
    runsBefore: ['dropCursor'],
    mount: ({ root, signal }: { dom: HTMLElement; root: Document | ShadowRoot; signal: AbortSignal }) => {
      root.addEventListener('dragstart', reset, { capture: true, signal });
      root.addEventListener('dragend', reset, { capture: true, signal });
      signal.addEventListener('abort', () => {
        reset();
        line?.remove();
        line = null;
      });
    },
    prosemirrorPlugins: [
      new Plugin<number | null>({
        key: tintKey,
        state: {
          init: () => null,
          apply(tr, value) {
            const meta = tr.getMeta(tintKey);
            if (meta !== undefined) return meta as number | null;
            if (value == null) return value;
            const mapped = tr.mapping.mapResult(value, 1);
            return mapped.deleted ? null : mapped.pos;
          },
        },
        props: {
          decorations(state) {
            const pos = tintKey.getState(state);
            const node = pos == null ? null : state.doc.nodeAt(pos);
            return pos == null || !node ? DecorationSet.empty : DecorationSet.create(state.doc, [Decoration.node(pos, pos + node.nodeSize, { 'data-nest-target': 'true' })]);
          },
          handleDOMEvents: {
            dragleave(view, event) {
              const to = (event as DragEvent).relatedTarget;
              if (!(to instanceof Node && view.dom.contains(to))) clear();
              return false;
            },
          },
          handleDrop(view, event) {
            if (!isBlockDrag(view)) return false;
            const ids = dragged ?? selectedBlockIds(view.state);
            const api = editor as BlockApi;
            if (!ids.length || !ids.every((id) => api.getBlock(id))) return false; // not a drag from this doc
            const at = intentAt(view, (event as DragEvent).clientX, (event as DragEvent).clientY, ids);
            reset();
            if (!at) return true; // dropped on itself: nothing moves
            try {
              applyIntent(api, ids, at);
            } catch {
              return false;
            }
            return true;
          },
        },
      }),
    ],
  }))();

  return { extension, hook, current: () => intent };
}
