'use client';

import { DragHandle } from '@tiptap/extension-drag-handle-react';
import type { Editor } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { offset } from '@floating-ui/dom';
import * as Popover from '@radix-ui/react-popover';
import { ArrowLeft, Check, ChevronRight, Copy, GripVertical, Plus, Repeat2, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { rcScope } from '@/components/rc-ui';
import { TURN_INTO_TYPES, type BlockType } from '@/lib/editor/blockTypes';

/** Vertical nudge so the handle sits on the block's first line (block padding + half the line). */
function firstLineOffset(node: PMNode | null): number {
  if (!node) return 3;
  switch (node.type.name) {
    case 'heading':
      return ({ 1: 10, 2: 7, 3: 4 } as Record<number, number>)[node.attrs.level as number] ?? 4;
    case 'callout':
      return 12;
    case 'codeBlock':
      return 6;
    case 'horizontalRule':
      return 0;
    default:
      return 3;
  }
}

/**
 * Handles for nested blocks too (list items, blocks inside toggles and callouts), as in
 * Notion: the block on the pointer's row gets the handle. Structural wrappers never get one, and
 * the first block of a callout or quote is the callout or quote itself (as a list item's first
 * paragraph is the item). Edge detection is off: TipTap's default ("near the top or left edge,
 * prefer the parent") knocked list items out whenever the pointer was in their top 12 px, so the
 * handle stuck on the block before.
 */
const NESTED = {
  edgeDetection: 'none' as const,
  rules: [
    {
      id: 'structuralParts',
      evaluate: ({ node }: { node: PMNode }) => (['detailsSummary', 'detailsContent'].includes(node.type.name) ? 1000 : 0),
    },
    {
      id: 'firstChildIsTheContainer',
      evaluate: ({ parent, isFirst }: { parent: PMNode | null; isFirst: boolean }) =>
        isFirst && parent && ['callout', 'blockquote'].includes(parent.type.name) ? 1000 : 0,
    },
  ],
};

/** How far left of its block the handle sits: past a bullet's or number's marker for list items. */
function gutterOffset(node: PMNode | null): number {
  return node?.type.name === 'listItem' ? 30 : 6;
}

/** The block under the pointer, per editor (read lazily by the handle's positioning). */
const hoverByEditor = new WeakMap<Editor, { node: PMNode | null; pos: number }>();
const hoverOf = (editor: Editor) => hoverByEditor.get(editor) ?? { node: null, pos: -1 };

type Target = { node: PMNode; pos: number };

/** Notion's block handle in the left gutter: "+" adds a block below, the grip drags or opens the block menu. */
export function BlockHandle({ editor }: { editor: Editor }) {
  const hovered = { get current() { return hoverOf(editor); }, set current(v) { hoverByEditor.set(editor, v); } };
  const [target, setTarget] = useState<Target | null>(null);
  const [view, setView] = useState<'main' | 'turn'>('main');
  const menuRef = useRef<HTMLDivElement>(null);

  const onNodeChange = useCallback(
    ({ node, pos }: { node: PMNode | null; pos: number }) => {
      hoverByEditor.set(editor, { node, pos });
    },
    [editor],
  );

  // Must keep its identity: TipTap's DragHandle re-creates its plugin, and hides the handle, every
  // time this object changes, so an inline object made the handle vanish on every re-render (the
  // menu opening, the page's "Saved" tick, presence updates).
  const positionConfig = useMemo(
    () => ({
      placement: 'left-start' as const,
      middleware: [offset(() => ({ mainAxis: gutterOffset(hoverOf(editor).node), crossAxis: firstLineOffset(hoverOf(editor).node) }))],
    }),
    [editor],
  );

  const open = (o: boolean) => {
    if (o) {
      const { node, pos } = hovered.current;
      if (!node || pos < 0) return;
      setTarget({ node, pos });
      setView('main');
      // The React DragHandle registers only the plugin (no lock commands): it reads this meta.
      editor.commands.setMeta('lockDragHandle', true);
    } else {
      setTarget(null);
      editor.commands.setMeta('lockDragHandle', false);
    }
  };

  const addBelow = () => {
    const { node, pos } = hovered.current;
    if (!node || pos < 0) return;
    if (node.type.name === 'paragraph' && node.content.size === 0) {
      editor.chain().focus().setTextSelection(pos + 1).insertContent('/').run();
      return;
    }
    const end = pos + node.nodeSize;
    editor.chain().focus().insertContentAt(end, { type: 'paragraph' }).setTextSelection(end + 1).insertContent('/').run();
  };

  /** Selects the whole block so a "Turn into" converts all of it. */
  const selectBlock = (t: Target) =>
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        const from = TextSelection.near(tr.doc.resolve(t.pos + 1), 1);
        const to = TextSelection.near(tr.doc.resolve(Math.max(t.pos + 1, t.pos + t.node.nodeSize - 1)), -1);
        tr.setSelection(TextSelection.create(tr.doc, from.from, Math.max(from.from, to.to)));
        return true;
      });

  const turnInto = (b: BlockType) => {
    if (!target) return;
    b.apply(selectBlock(target)).run();
    open(false);
  };

  const duplicate = () => {
    if (!target) return;
    editor.chain().focus().insertContentAt(target.pos + target.node.nodeSize, target.node.toJSON()).run();
    open(false);
  };

  const remove = () => {
    if (!target) return;
    editor.chain().focus().deleteRange({ from: target.pos, to: target.pos + target.node.nodeSize }).run();
    open(false);
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    next?.focus();
  };

  const isType = (b: BlockType) => {
    if (!target) return false;
    const n = target.node;
    switch (b.id) {
      case 'text': return n.type.name === 'paragraph';
      case 'h1': case 'h2': case 'h3': return n.type.name === 'heading' && `h${n.attrs.level}` === b.id;
      case 'bullet': return n.type.name === 'bulletList';
      case 'numbered': return n.type.name === 'orderedList';
      case 'todo': return n.type.name === 'taskList';
      case 'toggle': return n.type.name === 'details';
      case 'quote': return n.type.name === 'blockquote';
      case 'callout': return n.type.name === 'callout';
      case 'code': return n.type.name === 'codeBlock';
      default: return false;
    }
  };

  return (
    <DragHandle
      editor={editor}
      className={cn(rcScope, 'doc-drag-handle')}
      nested={NESTED}
      onNodeChange={onNodeChange}
      computePositionConfig={positionConfig}
    >
      <div className="doc-handle">
        <button type="button" className="doc-handle-btn" onClick={addBelow} aria-label="Add a block below" title="Add a block below">
          <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        </button>
        <Popover.Root open={!!target} onOpenChange={open}>
          <Popover.Anchor asChild>
            <button
              type="button"
              className="doc-handle-btn doc-handle-grip"
              onClick={() => open(!target)}
              aria-label="Drag to move, or click for block options"
              title="Drag to move · Click for options"
              aria-haspopup="menu"
              aria-expanded={!!target}
            >
              <GripVertical className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
          </Popover.Anchor>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={4}
              collisionPadding={12}
              className={cn(rcScope, 'rc-float rc-menu doc-block-menu')}
              onKeyDown={onMenuKey}
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
              }}
            >
              <div ref={menuRef} role="menu" aria-label="Block options">
                {view === 'main' ? (
                  <>
                    <button type="button" role="menuitem" className="rc-menu-item w-full" onClick={() => setView('turn')}>
                      <Repeat2 aria-hidden strokeWidth={1.75} />
                      <span className="flex-1 text-left">Turn into</span>
                      <ChevronRight aria-hidden strokeWidth={1.75} />
                    </button>
                    <button type="button" role="menuitem" className="rc-menu-item w-full" onClick={duplicate}>
                      <Copy aria-hidden strokeWidth={1.75} />
                      <span className="flex-1 text-left">Duplicate</span>
                    </button>
                    <div className="rc-menu-sep" />
                    <button type="button" role="menuitem" className="rc-menu-item w-full" data-danger="true" onClick={remove}>
                      <Trash2 aria-hidden strokeWidth={1.75} />
                      <span className="flex-1 text-left">Delete</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" role="menuitem" className="rc-menu-item w-full doc-menu-back" onClick={() => setView('main')}>
                      <ArrowLeft aria-hidden strokeWidth={1.75} />
                      <span className="flex-1 text-left">Turn into</span>
                    </button>
                    <div className="rc-menu-sep" />
                    {TURN_INTO_TYPES.map((b) => {
                      const Icon = b.icon;
                      const on = isType(b);
                      return (
                        <button key={b.id} type="button" role="menuitem" className="rc-menu-item w-full" onClick={() => turnInto(b)} aria-current={on || undefined}>
                          <Icon aria-hidden strokeWidth={1.75} />
                          <span className="flex-1 text-left">{b.label}</span>
                          {on && <Check aria-hidden strokeWidth={2} className="doc-menu-check" />}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </DragHandle>
  );
}
