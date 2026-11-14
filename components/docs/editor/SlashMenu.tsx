'use client';

import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';
import { computePosition, flip, offset, shift, size } from '@floating-ui/dom';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { rcScope } from '@/components/rc-ui';
import { filterBlockTypes, runSlashItem, type BlockType } from '@/lib/editor/blockTypes';

type MenuProps = SuggestionProps<BlockType, BlockType>;
interface MenuHandle {
  onKeyDown: (e: KeyboardEvent) => boolean;
}

/** The "/" menu: blocks grouped like Notion's, each with its Markdown shortcut as a hint. */
const SlashMenuList = forwardRef<MenuHandle, MenuProps>(function SlashMenuList({ items, command }, ref) {
  // The highlighted row resets to the first whenever the matches change (derived, not an effect).
  const [sel, setSel] = useState<{ items: BlockType[]; index: number }>({ items, index: 0 });
  const active = sel.items === items ? sel.index : 0;
  const setActive = (next: number | ((i: number) => number)) =>
    setSel((cur) => {
      const base = cur.items === items ? cur.index : 0;
      return { items, index: typeof next === 'function' ? next(base) : next };
    });
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (e) => {
      if (!items.length) return false;
      if (e.key === 'ArrowDown') {
        setActive((i) => (i + 1) % items.length);
        return true;
      }
      if (e.key === 'ArrowUp') {
        setActive((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const item = items[active];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return <div className="doc-slash-empty">No blocks match</div>;
  }

  return (
    <div ref={listRef} role="listbox" aria-label="Insert a block" className="doc-slash-list">
      {items.map((item, i) => {
        const header = i === 0 || items[i - 1]!.group !== item.group ? item.group : null;
        const Icon = item.icon;
        return (
          <div key={item.id}>
            {header && <div className="doc-slash-group">{header}</div>}
            <div
              role="option"
              aria-selected={i === active}
              data-index={i}
              className="doc-slash-item"
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => command(item)}
            >
              <span className="doc-slash-icon">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.hint && <kbd className="doc-slash-hint">{item.hint}</kbd>}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export const slashMenuKey = new PluginKey('docSlashMenu');

/** Type "/" anywhere (except inside code) to insert or turn a block into another type. */
export const SlashMenu = Extension.create({
  name: 'docSlashMenu',

  addProseMirrorPlugins() {
    return [
      Suggestion<BlockType, BlockType>({
        editor: this.editor,
        pluginKey: slashMenuKey,
        char: '/',
        allowSpaces: false,
        startOfLine: false,
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          return !$from.parent.type.spec.code;
        },
        items: ({ query }) => filterBlockTypes(query),
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: BlockType }) => runSlashItem(editor, range, props),
        render: () => {
          let renderer: ReactRenderer<MenuHandle, MenuProps> | null = null;
          let el: HTMLElement | null = null;

          const place = (props: MenuProps) => {
            const rect = props.clientRect?.();
            if (!el || !rect) return;
            const virtual = { getBoundingClientRect: () => rect };
            void computePosition(virtual, el, {
              strategy: 'fixed',
              placement: 'bottom-start',
              middleware: [
                offset(6),
                flip({ padding: 12 }),
                shift({ padding: 12 }),
                size({
                  padding: 12,
                  apply: ({ availableHeight }) => {
                    if (el) el.style.maxHeight = `${Math.max(160, Math.min(380, availableHeight))}px`;
                  },
                }),
              ],
            }).then(({ x, y }) => {
              if (el) Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
            });
          };

          return {
            onStart: (props) => {
              renderer = new ReactRenderer(SlashMenuList, { props, editor: props.editor });
              el = document.createElement('div');
              el.className = cn(rcScope, 'rc-float doc-slash');
              el.style.position = 'fixed';
              el.appendChild(renderer.element);
              document.body.appendChild(el);
              place(props);
            },
            onUpdate: (props) => {
              renderer?.updateProps(props);
              place(props);
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                el?.remove();
                el = null;
                return true;
              }
              return renderer?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              el?.remove();
              el = null;
              renderer?.destroy();
              renderer = null;
            },
          };
        },
      }),
    ];
  },
});
