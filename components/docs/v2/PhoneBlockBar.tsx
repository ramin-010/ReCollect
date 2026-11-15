'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Copy, IndentDecrease, IndentIncrease, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react';

/**
 * The block handle on a phone (no hover, so BlockNote's grip would sit off the screen): while he edits
 * on a touch screen, a bar above the keyboard acts on the block holding the caret: its kind (the
 * Turn into list), move up and down (a phone can't drag), indent and outdent, and "⋯" for Duplicate,
 * Ask AI and Delete. Buttons never take the focus, so the keyboard stays up.
 */

type Block = { id: string; type: string; props: Record<string, unknown>; children?: Block[] };
export type PhoneBarEditor = {
  getTextCursorPosition: () => { block: Block; prevBlock?: Block; nextBlock?: Block };
  setTextCursorPosition: (block: Block | string, placement?: 'start' | 'end') => void;
  updateBlock: (block: Block | string, update: unknown) => void;
  insertBlocks: (blocks: unknown[], ref: Block | string, placement: 'before' | 'after') => Block[];
  removeBlocks: (blocks: (Block | string)[]) => void;
  moveBlocksUp: () => void;
  moveBlocksDown: () => void;
  nestBlock: () => void;
  unnestBlock: () => void;
  canNestBlock: () => boolean;
  canUnnestBlock: () => boolean;
  onSelectionChange: (fn: () => void) => () => void;
  onChange: (fn: () => void) => () => void;
  focus: () => void;
};

export interface TurnIntoEntry {
  type: string;
  label: string;
  Icon: ComponentType<{ 'aria-hidden'?: boolean }>;
  props?: Record<string, unknown>;
}

/** A copy without ids (children too), so the editor gives the copies new ones. */
function fresh(b: Block): Record<string, unknown> {
  const { id: _id, children, ...rest } = b;
  void _id;
  return { ...rest, children: (children ?? []).map(fresh) };
}

const keep = (e: { preventDefault: () => void }) => e.preventDefault();

export function PhoneBlockBar({
  editor,
  root,
  turnInto,
  kindOf,
  onTurn,
  onAsk,
}: {
  editor: PhoneBarEditor;
  root: React.RefObject<HTMLDivElement | null>;
  turnInto: readonly TurnIntoEntry[];
  kindOf: (block: Block) => string;
  onTurn: (block: Block, type: string, props?: Record<string, unknown>) => void;
  onAsk: (() => void) | null;
}) {
  const [coarse, setCoarse] = useState(false);
  const [editing, setEditing] = useState(false);
  const [keyboard, setKeyboard] = useState(0);
  const [sheet, setSheet] = useState<null | 'kind' | 'more'>(null);
  const [, refresh] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  // A touch screen only (a phone or a tablet without a mouse).
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const on = () => setCoarse(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Shown while the editor holds the focus; a tap on the bar keeps it there.
  useEffect(() => {
    if (!coarse) return;
    const check = () => {
      const active = document.activeElement;
      const inEditor = !!active && !!root.current?.contains(active) && !!active.closest('.bn-editor');
      setEditing(inEditor);
      if (!inEditor) setSheet(null);
    };
    const later = () => setTimeout(check, 0);
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', later);
    check();
    return () => {
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', later);
    };
  }, [coarse, root]);

  // Sits on the keyboard: the visual viewport's bottom (Chrome keeps the layout viewport's size).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!coarse || !vv) return;
    const place = () => setKeyboard(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    place();
    vv.addEventListener('resize', place);
    vv.addEventListener('scroll', place);
    return () => {
      vv.removeEventListener('resize', place);
      vv.removeEventListener('scroll', place);
    };
  }, [coarse]);

  // The kind's label and what can move follow the caret; the caret never hides behind the bar
  // (the browser keeps it above the keyboard, not above this bar).
  useEffect(() => {
    if (!coarse) return;
    const clearOfBar = () => {
      const bar = barRef.current;
      const sel = window.getSelection();
      if (!bar || !sel?.rangeCount) return;
      const caret = sel.getRangeAt(0).getBoundingClientRect();
      const barTop = bar.getBoundingClientRect().top;
      if (!caret.height || caret.bottom <= barTop - 8) return;
      let scroller: HTMLElement | null = bar.parentElement;
      while (scroller && !(scroller.scrollHeight > scroller.clientHeight && /(auto|scroll)/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
      const by = Math.ceil(caret.bottom - (barTop - 16));
      if (scroller) scroller.scrollBy({ top: by });
      else window.scrollBy({ top: by });
    };
    const update = () => {
      refresh((n) => n + 1);
      requestAnimationFrame(clearOfBar);
    };
    const offs = [editor.onSelectionChange(update), editor.onChange(update)];
    return () => offs.forEach((off) => off());
  }, [coarse, editor]);

  const shown = coarse && editing;
  // The bottom tab bar steps aside while the bar shows.
  useEffect(() => {
    if (!shown) return;
    document.body.classList.add('doc-block-bar');
    return () => document.body.classList.remove('doc-block-bar');
  }, [shown]);

  // A tap outside an open sheet closes it.
  useEffect(() => {
    if (!sheet) return;
    const away = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setSheet(null);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [sheet]);

  if (!shown) return null;

  let block: Block | null = null;
  let canNest = false;
  let canUnnest = false;
  try {
    block = editor.getTextCursorPosition().block;
    canNest = editor.canNestBlock();
    canUnnest = editor.canUnnestBlock();
  } catch {
    return null;
  }
  if (!block) return null;
  const at = block;

  const act = (fn: () => void) => {
    fn();
    setSheet(null);
    refresh((n) => n + 1);
  };
  const duplicate = () =>
    act(() => {
      const [made] = editor.insertBlocks([fresh(at)], at, 'after');
      if (made) editor.setTextCursorPosition(made, 'end');
    });
  const remove = () =>
    act(() => {
      const { prevBlock, nextBlock } = editor.getTextCursorPosition();
      editor.removeBlocks([at]);
      const to = nextBlock ?? prevBlock;
      if (to) editor.setTextCursorPosition(to, 'end');
    });

  return (
    <div ref={barRef} className="phone-block-bar" style={{ bottom: keyboard, paddingBottom: keyboard ? undefined : 'max(2px, env(safe-area-inset-bottom))' }} role="toolbar" aria-label="Block">
      {sheet === 'kind' && (
        <div className="phone-block-sheet" role="menu" aria-label="Turn into">
          {turnInto.map(({ type, label, Icon, props }) => (
            <button
              key={label}
              type="button"
              role="menuitemradio"
              className="phone-block-row"
              aria-checked={kindOf(at) === label}
              onPointerDown={keep}
              onMouseDown={keep}
              onClick={() => act(() => onTurn(at, type, props))}
            >
              <Icon aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
      {sheet === 'more' && (
        <div className="phone-block-sheet" role="menu" aria-label="More">
          <button type="button" role="menuitem" className="phone-block-row" onPointerDown={keep} onMouseDown={keep} onClick={duplicate}>
            <Copy aria-hidden />
            <span>Duplicate</span>
          </button>
          {onAsk && (
            <button type="button" role="menuitem" className="phone-block-row" onPointerDown={keep} onMouseDown={keep} onClick={() => act(onAsk)}>
              <Sparkles aria-hidden />
              <span>Ask AI</span>
            </button>
          )}
          <button type="button" role="menuitem" className="phone-block-row phone-block-row--danger" onPointerDown={keep} onMouseDown={keep} onClick={remove}>
            <Trash2 aria-hidden />
            <span>Delete</span>
          </button>
        </div>
      )}
      <button
        type="button"
        className="phone-block-btn phone-block-kind"
        aria-haspopup="menu"
        aria-expanded={sheet === 'kind'}
        aria-label={`Turn into (now ${kindOf(at)})`}
        onPointerDown={keep}
        onMouseDown={keep}
        onClick={() => setSheet(sheet === 'kind' ? null : 'kind')}
      >
        <span>{kindOf(at)}</span>
        <ChevronDown aria-hidden />
      </button>
      <span className="phone-block-sep" aria-hidden />
      <button type="button" className="phone-block-btn" aria-label="Move up" onPointerDown={keep} onMouseDown={keep} onClick={() => act(() => editor.moveBlocksUp())}>
        <ArrowUp aria-hidden />
      </button>
      <button type="button" className="phone-block-btn" aria-label="Move down" onPointerDown={keep} onMouseDown={keep} onClick={() => act(() => editor.moveBlocksDown())}>
        <ArrowDown aria-hidden />
      </button>
      <button type="button" className="phone-block-btn" aria-label="Indent" disabled={!canNest} onPointerDown={keep} onMouseDown={keep} onClick={() => act(() => editor.nestBlock())}>
        <IndentIncrease aria-hidden />
      </button>
      <button type="button" className="phone-block-btn" aria-label="Outdent" disabled={!canUnnest} onPointerDown={keep} onMouseDown={keep} onClick={() => act(() => editor.unnestBlock())}>
        <IndentDecrease aria-hidden />
      </button>
      <button
        type="button"
        className="phone-block-btn"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={sheet === 'more'}
        onPointerDown={keep}
        onMouseDown={keep}
        onClick={() => setSheet(sheet === 'more' ? null : 'more')}
      >
        <MoreHorizontal aria-hidden />
      </button>
    </div>
  );
}
