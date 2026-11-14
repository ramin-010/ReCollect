import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeSelection, Plugin, PluginKey, TextSelection, type Transaction } from '@tiptap/pm/state';
import { Fragment, Slice, type Node as PMNode } from '@tiptap/pm/model';
import { ySyncPluginKey } from '@tiptap/y-tiptap';
import type * as Y from 'yjs';
import {
  CANVAS_HEIGHT,
  EMPTY_BOARD,
  boardIsEmpty,
  clampCanvasHeight,
  editorYDoc,
  newCanvasId,
  readBoard,
  sanitizeBoard,
  writeBoard,
  type CanvasBoard,
} from '@/lib/editor/canvasBoard';
import { CanvasView } from '@/components/docs/editor/canvas/CanvasView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    canvas: {
      /** Inserts a canvas block (empty, or with a board) at the selection. */
      insertCanvas: (attrs?: { data?: CanvasBoard; height?: number }) => ReturnType;
    };
  }
}

/** Writes made while absorbing a pasted or duplicated board (not part of a board's own undo). */
const ABSORB_ORIGIN = { source: 'canvas-absorb' };

const absorbKey = new PluginKey('canvasAbsorb');

/**
 * Keeps every canvas block pointing at its own board, for local changes only (a paste, a
 * duplicate, the slash menu, Markdown, a template). A block without an id, or with an id another
 * block already has, gets a fresh id and a copy of its board. A board that travelled in
 * `attrs.data` (the clipboard, the server's Markdown) is written into the Y.Doc and the attribute
 * cleared, so the Yjs fragment never holds board data.
 */
function absorbPlugin(getDoc: () => Y.Doc | null) {
  return new Plugin({
    key: absorbKey,
    appendTransaction(transactions, _old, state) {
      const root = transactions[0];
      if (!root || root.getMeta(ySyncPluginKey) !== undefined) return null;
      if (!transactions.some((tr) => tr.docChanged)) return null;
      const ydoc = getDoc();
      if (!ydoc) return null;

      const seen = new Set<string>();
      const writes: Array<[string, CanvasBoard]> = [];
      let tr: Transaction | null = null;
      state.doc.descendants((node, pos) => {
        if (node.type.name !== 'canvas') return !node.isTextblock;
        const id = typeof node.attrs.canvasId === 'string' && node.attrs.canvasId ? (node.attrs.canvasId as string) : null;
        const data = node.attrs.data ? sanitizeBoard(node.attrs.data) : null;
        if (!id || seen.has(id)) {
          const fresh = newCanvasId();
          writes.push([fresh, data ?? (id ? readBoard(ydoc, id) : EMPTY_BOARD)]);
          tr ??= state.tr;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, canvasId: fresh, data: null });
          seen.add(fresh);
        } else {
          if (data) {
            if (boardIsEmpty(ydoc, id)) writes.push([id, data]);
            tr ??= state.tr;
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, data: null });
          }
          seen.add(id);
        }
        return false;
      });
      if (!tr) return null;
      for (const [id, board] of writes) writeBoard(ydoc, id, board, ABSORB_ORIGIN);
      return tr;
    },
  });
}

function mapFragment(fragment: Fragment, fn: (node: PMNode) => PMNode): Fragment {
  const out: PMNode[] = [];
  fragment.forEach((child) => {
    const next = child.childCount > 0 ? child.copy(mapFragment(child.content, fn)) : child;
    out.push(fn(next));
  });
  return Fragment.fromArray(out);
}

/** Copied canvas blocks carry their board, so pasting into another doc brings the boxes along. */
function copyPlugin(getDoc: () => Y.Doc | null) {
  return new Plugin({
    key: new PluginKey('canvasCopy'),
    props: {
      transformCopied(slice) {
        const ydoc = getDoc();
        if (!ydoc) return slice;
        let found = false;
        const content = mapFragment(slice.content, (node) => {
          if (node.type.name !== 'canvas' || typeof node.attrs.canvasId !== 'string') return node;
          found = true;
          return node.type.create({ ...node.attrs, data: readBoard(ydoc, node.attrs.canvasId) }, null, node.marks);
        });
        return found ? new Slice(content, slice.openStart, slice.openEnd) : slice;
      },
    },
  });
}

/**
 * Events the board handles itself (ProseMirror stays out). Drag-and-drop of blocks still reaches
 * the editor, and so does mousemove: the block handle follows the pointer through it, so the
 * canvas gets its handle like any other block.
 */
function boardOwnsEvent(event: Event): boolean {
  if (event.type.startsWith('drag') || event.type === 'drop' || event.type === 'mousemove') return false;
  const target = event.target as HTMLElement | null;
  return !!target?.closest?.('.doc-canvas-surface, .doc-canvas-grip');
}

/**
 * A canvas: boxes, notes and arrows you drag, connect and edit, live in every tab. The block holds
 * only `canvasId` and `height`; the board lives in the doc's Y.Doc (see lib/editor/canvasBoard.ts).
 * `data` is a transient carrier for boards travelling as JSON (clipboard, Markdown), never stored.
 * The backend (services/docs/docSchema.ts) defines the same node; keep the two in step.
 */
export const Canvas = Node.create({
  name: 'canvas',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  isolating: true,

  addAttributes() {
    return {
      canvasId: {
        default: null,
        parseHTML: (el) => {
          const id = el.getAttribute('data-canvas-id');
          return id && /^cv_[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null;
        },
        renderHTML: (attrs) => (attrs.canvasId ? { 'data-canvas-id': attrs.canvasId } : {}),
      },
      height: {
        default: CANVAS_HEIGHT.initial,
        parseHTML: (el) => clampCanvasHeight(el.getAttribute('data-height')),
        renderHTML: (attrs) => ({ 'data-height': clampCanvasHeight(attrs.height) }),
      },
      data: {
        default: null,
        parseHTML: (el) => {
          const raw = el.getAttribute('data-board');
          if (!raw) return null;
          try {
            return sanitizeBoard(JSON.parse(raw));
          } catch {
            return null;
          }
        },
        renderHTML: (attrs) => (attrs.data ? { 'data-board': JSON.stringify(attrs.data) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="canvas"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'canvas' })];
  },

  addCommands() {
    return {
      insertCanvas:
        (attrs) =>
        ({ commands, tr, state }) => {
          const inserted = commands.insertContent({
            type: this.name,
            attrs: { canvasId: null, height: clampCanvasHeight(attrs?.height ?? CANVAS_HEIGHT.initial), data: attrs?.data ?? EMPTY_BOARD },
          });
          if (!inserted) return false;
          // The caret goes to the line below the board (typing must never replace a selected board).
          const sel = tr.selection;
          if (sel instanceof NodeSelection && sel.node.type.name === this.name) {
            const after = sel.to;
            if (!tr.doc.resolve(after).nodeAfter?.isTextblock) tr.insert(after, state.schema.nodes.paragraph!.create());
            tr.setSelection(TextSelection.create(tr.doc, after + 1));
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    // Backspace at the start of a line right after a canvas (or Delete at the end of one right
    // before it) selects the canvas first instead of deleting a whole board at once.
    const selectNeighbour = (dir: -1 | 1) => () => {
      const { selection } = this.editor.state;
      if (!selection.empty) return false;
      const $pos = selection.$from;
      if ($pos.depth < 1 || $pos.parent.content.size === 0) return false;
      if (dir < 0 ? $pos.parentOffset !== 0 : $pos.parentOffset !== $pos.parent.content.size) return false;
      const container = $pos.node($pos.depth - 1);
      const index = $pos.index($pos.depth - 1) + dir;
      if (index < 0 || index >= container.childCount) return false;
      const sibling = container.child(index);
      if (sibling.type.name !== this.name) return false;
      return this.editor.commands.setNodeSelection(dir < 0 ? $pos.before() - sibling.nodeSize : $pos.after());
    };
    return { Backspace: selectNeighbour(-1), Delete: selectNeighbour(1) };
  },

  addProseMirrorPlugins() {
    const getDoc = () => editorYDoc(this.editor);
    return [absorbPlugin(getDoc), copyPlugin(getDoc)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CanvasView, {
      stopEvent: ({ event }) => boardOwnsEvent(event),
      ignoreMutation: () => true,
    });
  },
});
