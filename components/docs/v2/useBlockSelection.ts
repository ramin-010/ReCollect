'use client';

/**
 * Notion's block selection (NB-12 to NB-14) on BlockNote, which has none built in: Esc selects the
 * block holding the caret; ↑/↓ move the selection, Shift+↑/↓ extend it; Ctrl+D duplicates and
 * Backspace/Delete removes the selected blocks; Enter or a click goes back to typing. The selected
 * blocks carry `data-block-selected` (tinted by CSS: accent 14 %, inset 2 px, radius 4).
 */
import { useEffect, useMemo, useRef } from 'react';

type AnyBlock = { id: string };
type Editor = {
  getTextCursorPosition: () => { block: AnyBlock };
  document: AnyBlock[];
  getBlock: (id: string) => AnyBlock | undefined;
  getPrevBlock?: (id: string) => AnyBlock | undefined;
  getNextBlock?: (id: string) => AnyBlock | undefined;
  removeBlocks: (ids: string[]) => void;
  insertBlocks: (blocks: unknown[], ref: string, placement: 'before' | 'after') => AnyBlock[];
  setTextCursorPosition: (id: string, placement?: 'start' | 'end') => void;
  focus: () => void;
};

/** Every block in reading order (children after their parent), as Notion's arrows walk them. */
function flatten(blocks: Array<AnyBlock & { children?: AnyBlock[] }>): AnyBlock[] {
  return blocks.flatMap((b) => [b, ...flatten((b as { children?: Array<AnyBlock & { children?: AnyBlock[] }> }).children ?? [])]);
}

export function useBlockSelection(editor: Editor | null, root: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const selected = useRef<string[]>([]);
  const anchor = useRef<string | null>(null);
  const clearRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = root.current;
    if (!editor || !el || !enabled) return;
    const paint = () => {
      el.querySelectorAll('[data-block-selected]').forEach((n) => n.removeAttribute('data-block-selected'));
      for (const id of selected.current) el.querySelector(`[data-node-type="blockContainer"][data-id="${id}"]`)?.setAttribute('data-block-selected', '');
    };
    const clear = () => {
      selected.current = [];
      anchor.current = null;
      paint();
    };
    clearRef.current = clear;
    const order = () => flatten(editor.document as Array<AnyBlock & { children?: AnyBlock[] }>).map((b) => b.id);
    const onKey = (e: KeyboardEvent) => {
      // Typing in the Ask Kaaga box is not the doc's: no block keys there.
      if ((e.target as HTMLElement | null)?.closest?.('.doc-ask')) return;
      const active = selected.current.length > 0;
      if (!active) {
        if (e.key === 'Escape' && el.contains(document.activeElement)) {
          // let open menus close first: only a plain caret in the text selects the block
          if (document.querySelector('.lab-slash, .lab-block-menu')) return;
          const id = editor.getTextCursorPosition().block.id;
          selected.current = [id];
          anchor.current = id;
          (document.activeElement as HTMLElement | null)?.blur();
          paint();
          e.preventDefault();
        }
        return;
      }
      const ids = order();
      const first = ids.indexOf(selected.current[0]!);
      const last = ids.indexOf(selected.current[selected.current.length - 1]!);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const down = e.key === 'ArrowDown';
        if (e.shiftKey) {
          const a = ids.indexOf(anchor.current ?? selected.current[0]!);
          const edge = down ? Math.min(ids.length - 1, (a === first ? last : first) + 1) : Math.max(0, (a === last ? first : last) - 1);
          const [lo, hi] = [Math.min(a, edge), Math.max(a, edge)];
          selected.current = ids.slice(lo, hi + 1);
        } else {
          const next = down ? Math.min(ids.length - 1, last + 1) : Math.max(0, first - 1);
          selected.current = [ids[next]!];
          anchor.current = ids[next]!;
        }
        paint();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const gone = [...selected.current];
        clear();
        editor.removeBlocks(gone);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const blocks = selected.current.map((id) => editor.getBlock(id)).filter(Boolean) as AnyBlock[];
        const copies = blocks.map((b) => {
          const c = { ...(b as object) } as Record<string, unknown>;
          delete c.id;
          return c;
        });
        const made = editor.insertBlocks(copies, selected.current[selected.current.length - 1]!, 'after');
        selected.current = made.map((b) => b.id);
        anchor.current = selected.current[0] ?? null;
        requestAnimationFrame(paint);
      } else if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        const id = selected.current[0]!;
        clear();
        if (e.key === 'Enter') {
          editor.setTextCursorPosition(id, 'end');
          editor.focus();
        }
      }
    };
    // NB-15: a drag that starts in the margin left of the blocks draws a marquee (the same tint) and
    // selects every block it touches, live; the selection stays after release.
    let box: HTMLDivElement | null = null;
    let start: { x: number; y: number } | null = null;
    const onMove = (e: MouseEvent) => {
      if (!start) return;
      const [x1, x2] = [Math.min(start.x, e.clientX), Math.max(start.x, e.clientX)];
      const [y1, y2] = [Math.min(start.y, e.clientY), Math.max(start.y, e.clientY)];
      if (!box) {
        if (Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) < 4) return;
        box = document.createElement('div');
        box.className = 'lab-marquee';
        document.body.appendChild(box);
      }
      Object.assign(box.style, { left: `${x1}px`, top: `${y1}px`, width: `${x2 - x1}px`, height: `${y2 - y1}px` });
      const hit = Array.from(el.querySelectorAll<HTMLElement>('[data-node-type="blockContainer"]')).filter((b) => {
        // the block's own row is its first content (a toggle wraps it; its children come after)
        const r = b.querySelector('.bn-block-content')?.getBoundingClientRect();
        return !!r && r.bottom > y1 && r.top < y2 && r.right > x1;
      });
      // the outermost blocks only: a selected parent carries its children (as in Notion)
      selected.current = hit.filter((b) => !hit.some((o) => o !== b && b.contains(o) === false && o.contains(b))).map((b) => b.getAttribute('data-id')!).filter(Boolean);
      anchor.current = selected.current[0] ?? null;
      paint();
      e.preventDefault();
    };
    const onUp = () => {
      start = null;
      box?.remove();
      box = null;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (selected.current.length && !target.closest('.lab-side')) clear();
      const r = el.getBoundingClientRect();
      const blocks = el.querySelector('.bn-block-group')?.getBoundingClientRect();
      const inMargin = !!blocks && e.button === 0 && e.clientY >= r.top && e.clientY <= r.bottom && e.clientX < blocks.left && e.clientX > blocks.left - 140 && !target.closest('.lab-side, .lab-menu, button, a, input, textarea');
      if (!inMargin) return;
      start = { x: e.clientX, y: e.clientY };
      (document.activeElement as HTMLElement | null)?.blur();
      e.preventDefault();
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      onUp();
      clearRef.current = () => {};
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [editor, root, enabled]);

  // Ask Kaaga reads what is selected, then lets it go (its box tints those blocks itself).
  return useMemo(() => ({ selected: () => [...selected.current], clear: () => clearRef.current() }), []);
}
