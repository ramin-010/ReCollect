import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

type Coords = { left: number; top: number };
type Hit = { pos: number; inside: number } | null;

/**
 * The pointer's row decides the block, as in Notion. ProseMirror maps a point in the space left of
 * a nested block (a toggle's chevron column, a callout's icon column, the page gutter) to a spot
 * BETWEEN blocks: the end of the container, or its first block. So the block handle jumped to the
 * container's first line on the way to a nested block's handle, and a click there put the caret
 * at the end of the container instead of in the clicked line.
 *
 * This wraps the view's posAtCoords: a position between blocks becomes a position inside the block
 * whose row holds the pointer (nearest across, when several share the row). The drag
 * handle, clicks and drops all ask posAtCoords, so they all agree.
 */
function rowAware(view: EditorView, original: (coords: Coords) => Hit) {
  const adjust = (hit: Hit, coords: Coords, depth: number): Hit => {
    if (!hit || depth > 6) return hit;
    const { doc } = view.state;
    const $p = doc.resolve(hit.pos);
    const parent = $p.parent;
    if (parent.inlineContent || parent.childCount === 0) return hit;
    const start = $p.start();
    let best: { pos: number; size: number; atom: boolean; rect: DOMRect } | null = null;
    let bestDx = Infinity;
    parent.forEach((child, offset) => {
      const pos = start + offset;
      const dom = view.nodeDOM(pos);
      if (!(dom instanceof HTMLElement)) return;
      const rect = dom.getBoundingClientRect();
      if (coords.top < rect.top || coords.top > rect.bottom) return;
      const dx = coords.left < rect.left ? rect.left - coords.left : coords.left > rect.right ? coords.left - rect.right : 0;
      if (dx < bestDx) {
        bestDx = dx;
        best = { pos, size: child.nodeSize, atom: child.isAtom, rect };
      }
    });
    if (!best) return hit;
    const row = best as { pos: number; size: number; atom: boolean; rect: DOMRect };
    if (row.atom) return { pos: row.pos, inside: row.pos };
    const inner = original({ left: Math.min(Math.max(coords.left, row.rect.left + 2), row.rect.right - 2), top: coords.top });
    if (!inner || inner.pos <= row.pos || inner.pos >= row.pos + row.size) return hit;
    return adjust(inner, coords, depth + 1);
  };
  return (coords: Coords): Hit => adjust(original(coords), coords, 0);
}

export const RowHit = Extension.create({
  name: 'rowHit',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('rowHit'),
        view: (view) => {
          const original = view.posAtCoords.bind(view);
          (view as { posAtCoords: (coords: Coords) => Hit }).posAtCoords = rowAware(view, original);
          return {
            destroy: () => {
              delete (view as { posAtCoords?: unknown }).posAtCoords;
            },
          };
        },
      }),
    ];
  },
});
