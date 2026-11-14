import { Extension } from '@tiptap/core';
import type { Node as PMNode, Slice } from '@tiptap/pm/model';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/**
 * Dropping a block dragged by its handle, as in Notion: the block under the pointer decides where
 * it lands (its top half: above it, its bottom half: below it), wherever the pointer is across the
 * row, and a blue line shows the spot while you drag. ProseMirror's own drop goes by the text
 * position under the pointer, so a block dropped on the left half of a line landed above it.
 * The insert goes through ProseMirror's replaceRange, which wraps what it must (a list item dropped
 * between paragraphs lands in a list), so a drop never builds an invalid doc.
 */

/** Blocks that hold blocks: a block directly inside one of these is a unit you can drop beside. */
const CONTAINERS = new Set(['doc', 'callout', 'detailsContent', 'blockquote']);
const LISTS = new Set(['bulletList', 'orderedList', 'taskList']);

interface Target {
  /** Where the dragged blocks go. */
  pos: number;
  /** The line: viewport coordinates. */
  left: number;
  width: number;
  top: number;
}

/** True while a drag started from the block handle (TipTap marks the handle). */
function isHandleDrag(view: EditorView): boolean {
  if (!view.dragging) return false;
  return !!document.querySelector('.doc-drag-handle[data-dragging="true"]');
}

function isUnit(_node: PMNode, parent: PMNode): boolean {
  return CONTAINERS.has(parent.type.name) || LISTS.has(parent.type.name);
}

/** The droppable block under the pointer (the deepest one), and where the dragged blocks would go. */
function targetAt(view: EditorView, x: number, y: number): Target | null {
  const { doc } = view.state;
  if (doc.childCount === 0) return null;
  const box = view.dom.getBoundingClientRect();
  const padLeft = parseFloat(getComputedStyle(view.dom).paddingLeft) || 0;
  // Across the row the x doesn't matter: read the block at the pointer's height, inside the text column.
  const px = Math.min(Math.max(x, box.left + padLeft + 8), box.right - 8);
  const first = view.nodeDOM(0) as HTMLElement | null;
  const lastPos = doc.content.size - doc.lastChild!.nodeSize;
  const last = view.nodeDOM(lastPos) as HTMLElement | null;
  const lineFor = (rect: DOMRect, below: boolean, pos: number): Target => ({
    pos,
    left: rect.left,
    width: rect.width,
    top: below ? rect.bottom : rect.top,
  });
  if (first?.getBoundingClientRect && y < first.getBoundingClientRect().top) return lineFor(first.getBoundingClientRect(), false, 0);
  if (last?.getBoundingClientRect && y > last.getBoundingClientRect().bottom) return lineFor(last.getBoundingClientRect(), true, doc.content.size);

  const hit = view.posAtCoords({ left: px, top: y });
  if (!hit) return null;
  // The innermost node under the pointer, then its ancestors: the deepest droppable unit wins.
  const candidates: Array<{ pos: number; node: PMNode }> = [];
  if (hit.inside >= 0) {
    const node = doc.nodeAt(hit.inside);
    if (node) candidates.push({ pos: hit.inside, node });
  }
  const $p = doc.resolve(hit.inside >= 0 ? hit.inside : hit.pos);
  for (let d = $p.depth; d > 0; d -= 1) candidates.push({ pos: $p.before(d), node: $p.node(d) });
  for (const c of candidates) {
    const $c = doc.resolve(c.pos);
    if (!c.node.isBlock || !isUnit(c.node, $c.parent)) continue;
    const dom = view.nodeDOM(c.pos) as HTMLElement | null;
    if (!dom?.getBoundingClientRect) continue;
    const rect = dom.getBoundingClientRect();
    const below = y > rect.top + rect.height / 2;
    return lineFor(rect, below, below ? c.pos + c.node.nodeSize : c.pos);
  }
  return null;
}

/** The dragged range (the handle selects it when the drag starts). */
function draggedRange(view: EditorView): { from: number; to: number } {
  const { from, to } = view.state.selection;
  return { from, to };
}

function drop(view: EditorView, target: Target, slice: Slice, moved: boolean): void {
  const { from, to } = draggedRange(view);
  // Onto itself (just above or below its own place): nothing moves.
  if (moved && target.pos >= from && target.pos <= to) return;
  let tr = view.state.tr;
  let at = target.pos;
  if (moved) {
    tr = tr.deleteSelection();
    at = tr.mapping.map(at);
  }
  tr = tr.replaceRange(at, at, slice);
  // Select what was dropped (it starts where it was inserted), so it stays highlighted where it landed.
  const start = Math.min(at, tr.doc.content.size);
  const node = tr.doc.nodeAt(start);
  if (node && slice.content.childCount === 1 && NodeSelection.isSelectable(node)) tr.setSelection(NodeSelection.create(tr.doc, start));
  else tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(start + 1, tr.doc.content.size))));
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

const key = new PluginKey('docBlockDrop');

export const BlockDrop = Extension.create({
  name: 'blockDrop',

  addProseMirrorPlugins() {
    const editor = this.editor;
    let line: HTMLDivElement | null = null;
    const hide = () => {
      if (line) line.style.display = 'none';
      document.body.classList.remove('doc-block-dragging');
    };
    const show = (t: Target) => {
      if (!line) {
        line = document.createElement('div');
        line.className = 'doc-drop-line';
        document.body.appendChild(line);
      }
      document.body.classList.add('doc-block-dragging');
      Object.assign(line.style, { display: 'block', left: `${t.left}px`, top: `${t.top - 1.5}px`, width: `${t.width}px` });
    };

    return [
      new Plugin({
        key,
        view: () => ({
          destroy: () => {
            line?.remove();
            line = null;
            document.body.classList.remove('doc-block-dragging');
          },
        }),
        props: {
          handleDOMEvents: {
            dragover: (view, event) => {
              if (!editor.isEditable || !isHandleDrag(view)) return false;
              document.body.classList.add('doc-block-dragging');
              const t = targetAt(view, event.clientX, event.clientY);
              const { from, to } = draggedRange(view);
              if (!t || (t.pos >= from && t.pos <= to)) {
                if (line) line.style.display = 'none';
              } else show(t);
              // No preventDefault here: TipTap runs later extensions' handlers first, and a prevented
              // event stops the chain. ProseMirror's own dragover handler allows the drop.
              return false;
            },
            dragleave: (_view, event) => {
              if (!(event.relatedTarget instanceof window.Node)) hide();
              return false;
            },
            dragend: () => {
              hide();
              return false;
            },
            drop: () => {
              if (line) line.style.display = 'none';
              return false;
            },
          },
          handleDrop: (view, event, slice, moved) => {
            if (!editor.isEditable || !isHandleDrag(view)) return false;
            hide();
            const t = targetAt(view, (event as DragEvent).clientX, (event as DragEvent).clientY);
            if (t) drop(view, t, slice, moved);
            return true;
          },
        },
      }),
    ];
  },
});
