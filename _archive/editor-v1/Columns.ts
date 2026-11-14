import { Node, mergeAttributes, type Editor } from '@tiptap/core';
import { Fragment, type Node as PMNode, type Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

/**
 * Side-by-side blocks (Notion's columns). `columns` holds 2–4 `column`s; each column holds blocks.
 * Make them from the slash menu, or drag a block by its handle onto the right or left edge of
 * another block. A columns block left with one column unwraps itself.
 * Markdown has no columns: the backend flattens them to their blocks, in order.
 */

const MAX_COLUMNS = 4;
const EDGE_PX = 56;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      /** Inserts an empty row of `count` columns below the current block (or in place of an empty line). */
      insertColumns: (count?: number) => ReturnType;
    };
  }
}

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,

  addAttributes() {
    return {
      /** Share of the row (a flex-grow factor); null = equal. Set by dragging the line between columns. */
      width: {
        default: null,
        parseHTML: (el) => {
          const v = parseFloat(el.getAttribute('data-width') ?? '');
          return Number.isFinite(v) && v > 0 ? v : null;
        },
        renderHTML: (attrs) => (attrs.width ? { 'data-width': attrs.width, style: `flex-grow: ${attrs.width}` } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'doc-col' }), 0];
  },
});

type DropTarget = { side: 'left' | 'right'; pos: number; node: PMNode; inColumnAt: number | null; rect: DOMRect };

/** The block under the pointer when it is near that block's left or right edge. */
export function edgeTarget(view: EditorView, event: DragEvent | MouseEvent): DropTarget | null {
  const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!hit) return null;
  const { doc } = view.state;
  // `inside` is the innermost node under the pointer; step into it so its ancestors resolve.
  const base = hit.inside >= 0 ? Math.min(hit.inside + 1, doc.content.size) : hit.pos;
  const $pos = doc.resolve(base);
  // The block to sit beside: a top-level block, or a block directly inside a column.
  let depth = 1;
  let inColumnAt: number | null = null;
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === 'column') {
      depth = d + 1;
      inColumnAt = $pos.before(d);
      break;
    }
  }
  if ($pos.depth < depth) return null;
  const pos = $pos.before(depth);
  const node = doc.nodeAt(pos);
  if (!node || node.type.name === 'columns' || node.type.name === 'column') return null;
  const dom = view.nodeDOM(pos) as HTMLElement | null;
  if (!dom?.getBoundingClientRect) return null;
  return sideOf(event, dom.getBoundingClientRect(), pos, node, inColumnAt);
}

function sideOf(event: DragEvent | MouseEvent, rect: DOMRect, pos: number, node: PMNode, inColumnAt: number | null): DropTarget | null {
  if (event.clientY < rect.top || event.clientY > rect.bottom) return null;
  if (event.clientX >= rect.right - EDGE_PX && event.clientX <= rect.right + 24) return { side: 'right', pos, node, inColumnAt, rect };
  if (event.clientX <= rect.left + 16 && event.clientX >= rect.left - 24) return { side: 'left', pos, node, inColumnAt, rect };
  return null;
}

/** Puts the dragged blocks beside the target: a new columns block, or a new column in an existing one. */
function dropBeside(view: EditorView, target: DropTarget, slice: Slice, moved: boolean): boolean {
  const { state } = view;
  const columnType = state.schema.nodes.column;
  const columnsType = state.schema.nodes.columns;
  if (!columnType || !columnsType) return false;
  const content = slice.content;
  if (!content.childCount) return false;
  let tr: Transaction = state.tr;
  const sel = state.selection;
  // A handle drag selects the dragged block: never drop a block beside itself.
  if (moved && sel.from <= target.pos && target.pos < sel.to) return false;
  if (moved) tr = tr.deleteSelection();
  const map = (p: number) => tr.mapping.map(p);
  const newColumn = columnType.create(null, content);

  if (target.inColumnAt !== null) {
    const columnsPos = state.doc.resolve(target.inColumnAt).before();
    const columnsNode = state.doc.nodeAt(columnsPos);
    if (!columnsNode || columnsNode.childCount >= MAX_COLUMNS) return false;
    const colNode = state.doc.nodeAt(target.inColumnAt);
    if (!colNode) return false;
    const at = target.side === 'right' ? map(target.inColumnAt + colNode.nodeSize) : map(target.inColumnAt);
    tr = tr.insert(at, newColumn);
  } else {
    const from = map(target.pos);
    const node = tr.doc.nodeAt(from);
    if (!node) return false;
    const existing = columnType.create(null, node);
    const pair = target.side === 'right' ? [existing, newColumn] : [newColumn, existing];
    tr = tr.replaceWith(from, from + node.nodeSize, columnsType.create(null, Fragment.fromArray(pair)));
  }
  view.dispatch(tr.scrollIntoView());
  return true;
}

const dropKey = new PluginKey('docColumnsDrop');

function columnsDropPlugin(editor: Editor) {
  let indicator: HTMLDivElement | null = null;
  const hide = () => {
    if (indicator) indicator.style.display = 'none';
  };
  return new Plugin({
    key: dropKey,
    view: () => ({
      destroy: () => {
        indicator?.remove();
        indicator = null;
      },
    }),
    props: {
      handleDOMEvents: {
        dragover: (view, event) => {
          if (!editor.isEditable || !view.dragging) return false;
          const t = edgeTarget(view, event);
          if (!t) {
            hide();
            return false;
          }
          if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'doc-col-drop';
            document.body.appendChild(indicator);
          }
          const x = t.side === 'right' ? t.rect.right + 4 : t.rect.left - 6;
          Object.assign(indicator.style, { display: 'block', left: `${x}px`, top: `${t.rect.top}px`, height: `${t.rect.height}px` });
          event.preventDefault();
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
          hide();
          return false;
        },
      },
      handleDrop: (view, event, slice, moved) => {
        if (!editor.isEditable) return false;
        const t = edgeTarget(view, event as DragEvent);
        if (!t) return false;
        return dropBeside(view, t, slice, moved);
      },
    },
    // A columns block with one column left (its sibling was dragged out) becomes plain blocks again.
    appendTransaction: (trs, _old, state) => {
      if (!trs.some((t) => t.docChanged)) return null;
      const fixes: { pos: number; node: PMNode }[] = [];
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'columns') {
          if (node.childCount === 1) fixes.push({ pos, node });
          return false;
        }
        return node.isBlock && node.type.name !== 'column' ? false : true;
      });
      if (!fixes.length) return null;
      const tr = state.tr;
      for (const f of fixes.reverse()) tr.replaceWith(f.pos, f.pos + f.node.nodeSize, f.node.firstChild!.content);
      return tr;
    },
  });
}

const resizeKey = new PluginKey('docColumnsResize');
const MIN_COL_PX = 120;

/** A grip on the line between two columns: drag it to change their widths (saved on release). */
function columnsResizePlugin(editor: Editor) {
  return new Plugin({
    key: resizeKey,
    props: {
      decorations: (state) => {
        if (!editor.isEditable) return null;
        const decos: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (node.type.name !== 'columns') return node.isBlock ? node.type.name === 'column' || node.type.name === 'doc' : false;
          let offset = pos + 1;
          node.forEach((col, _o, index) => {
            if (index > 0) {
              const at = offset + 1; // inside this column, before its first block
              decos.push(Decoration.widget(at, (view) => makeResizer(view, at - 1), { side: -1, key: `col-resizer-${at}`, ignoreSelection: true }));
            }
            offset += col.nodeSize;
          });
          return false;
        });
        return DecorationSet.create(state.doc, decos);
      },
    },
  });
}

/** The grip for the column at `colPos` (it resizes that column and the one before it). */
function makeResizer(view: EditorView, colPos: number): HTMLElement {
  const grip = document.createElement('div');
  grip.className = 'doc-col-resizer';
  grip.contentEditable = 'false';
  grip.setAttribute('aria-hidden', 'true');
  grip.addEventListener('mousedown', (event) => {
    event.preventDefault();
    const $col = view.state.doc.resolve(colPos);
    const index = $col.index();
    const rowPos = $col.before();
    const row = view.state.doc.nodeAt(rowPos);
    if (!row || index < 1) return;
    const rightPos = colPos;
    const leftPos = colPos - row.child(index - 1).nodeSize;
    const leftDom = view.nodeDOM(leftPos) as HTMLElement | null;
    const rightDom = view.nodeDOM(rightPos) as HTMLElement | null;
    if (!leftDom || !rightDom) return;
    const w1 = leftDom.getBoundingClientRect().width;
    const w2 = rightDom.getBoundingClientRect().width;
    const g1 = Number(row.child(index - 1).attrs.width) || 1;
    const g2 = Number(row.child(index).attrs.width) || 1;
    const total = w1 + w2;
    const grow = g1 + g2;
    const startX = event.clientX;
    let n1 = g1;
    let n2 = g2;
    document.body.classList.add('doc-col-resizing');
    const move = (e: MouseEvent) => {
      const left = Math.min(total - MIN_COL_PX, Math.max(MIN_COL_PX, w1 + e.clientX - startX));
      n1 = Math.round((grow * left) / total * 1000) / 1000;
      n2 = Math.round((grow - n1) * 1000) / 1000;
      leftDom.style.flexGrow = String(n1);
      rightDom.style.flexGrow = String(n2);
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.classList.remove('doc-col-resizing');
      if (n1 === g1 && n2 === g2) return;
      const tr = view.state.tr;
      tr.setNodeMarkup(leftPos, undefined, { ...row.child(index - 1).attrs, width: n1 });
      tr.setNodeMarkup(rightPos, undefined, { ...row.child(index).attrs, width: n2 });
      view.dispatch(tr);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
  return grip;
}

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,4}',
  isolating: true,
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns', class: 'doc-cols' }), 0];
  },

  addCommands() {
    return {
      insertColumns:
        (count = 2) =>
        ({ state, chain }) => {
          const n = Math.min(MAX_COLUMNS, Math.max(2, count));
          const cols = Array.from({ length: n }, () => ({ type: 'column', content: [{ type: 'paragraph' }] }));
          const { $from } = state.selection;
          const top = $from.depth >= 1 ? $from.before(1) : 0;
          const block = state.doc.nodeAt(top);
          if (block && block.type.name === 'paragraph' && block.content.size === 0) {
            return chain()
              .insertContentAt({ from: top, to: top + block.nodeSize }, { type: 'columns', content: cols })
              .setTextSelection(top + 3)
              .run();
          }
          const end = block ? top + block.nodeSize : state.doc.content.size;
          return chain().insertContentAt(end, { type: 'columns', content: cols }).setTextSelection(end + 3).run();
        },
    };
  },

  addProseMirrorPlugins() {
    return [columnsDropPlugin(this.editor), columnsResizePlugin(this.editor)];
  },
});
