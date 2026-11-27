'use client';

/**
 * The BlockNote spike inside the app (DOCS_EDITOR_V2_PLAN §3 0b, steps 1, 2, 4 and 6): BlockNote
 * 0.57 on the doc's live Y.Doc, on a NEW fragment "blocks" (the old editor's "default" fragment
 * is untouched), with our own side menu, slash menu and format bar on theme tokens, sized to
 * Notion's measurements (context/research/notion-editor-behaviour.md). Throwaway: /lab/editor.
 */
import '@blocknote/core/style.css';
import './lab-editor.css';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type * as Y from 'yjs';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { docApi } from '@/lib/api/docApi';
import {
  BlockNoteViewRaw,
  FilePanelController,
  FormattingToolbarController,
  SideMenuController,
  SuggestionMenuController,
  TableHandlesController,
  useBlockNoteEditor,
  useCreateBlockNote,
  useExtension,
  useExtensionState,
  type SuggestionMenuProps,
} from '@blocknote/react';
import { SideMenuExtension, SuggestionMenu, filterSuggestionItems, getDefaultSlashMenuItems, type DefaultSuggestionItem } from '@blocknote/core/extensions';
import { withCollaboration } from '@blocknote/core/yjs';
import { createExtension } from '@blocknote/core';
import {
  Baseline,
  Bold,
  Check,
  ChevronDown,
  Code,
  CodeXml,
  Copy,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Lightbulb,
  Link2,
  List,
  ListChecks,
  ListCollapse,
  ListOrdered,
  Minus,
  PanelsTopLeft,
  Plus,
  Quote,
  Strikethrough,
  Table,
  Trash2,
  Type,
  Underline,
  Workflow,
  Image as ImageIcon,
  FileText,
  FileSymlink,
} from 'lucide-react';
import { LinkPageDialog } from '@/components/docs/pages/LinkPageDialog';
import { cn } from '@/lib/utils';
import { rcScope } from '@/components/rc-ui';
import { newCanvasId, sanitizeBoard, writeBoard } from '@/lib/editor/canvasBoard';
import { looksLikeMarkdown } from '@/components/docs/editor/useLiveDocEditor';
import { agentApi } from '@/lib/api/agentApi';
import { docSchema } from '@/lib/blocks/schema';
import { syntaxHighlighting } from '@/lib/blocks/code/highlighter';
import { BlockDocContext } from '@/lib/blocks/canvas/View';
import { useBlockSelection } from './useBlockSelection';
import { createBlockDrop } from './blockDrop';
import { RcFilePanel } from './RcFilePanel';
import { NoCellHandle, RcTableExtend, RcTableHandle } from './RcTableHandles';
import { DocAsk, type AskFocus, type DocAskEditor } from './DocAsk';
import { PhoneBlockBar, type PhoneBarEditor } from './PhoneBlockBar';
import { uploadToCloud } from '@/lib/utils/upload';
import { KaagaIcon } from '@/components/brand/kaaga';

type Editor = typeof docSchema.BlockNoteEditor;

/** Opens Ask Kaaga on what he is pointing at (null where the doc can't be changed: read-only, the public page). */
const AskContext = createContext<(() => void) | null>(null);

/** An id for an uploaded image (the old editor's format). */
const newImageId = () => `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/**
 * A toggle he makes starts open, as in Notion, so Enter after its title goes inside. BlockNote 0.57
 * keeps each toggle's state in localStorage under `toggle-<block id>` and reads it when the block's
 * view is made; a block that already has its view (a new block the slash menu inserted) is opened
 * by its own triangle a frame later. Toggles that arrive any other way (seeded, an agent's) keep
 * BlockNote's closed start.
 */
function openToggle(id: string) {
  try {
    window.localStorage.setItem(`toggle-${id}`, 'true');
  } catch {
    // storage blocked: the toggle starts closed
  }
  requestAnimationFrame(() => {
    const button = document.querySelector<HTMLButtonElement>(`.lab-editor [data-node-type="blockContainer"][data-id="${id}"] .bn-toggle-button`);
    if (button?.getAttribute('aria-expanded') === 'false') button.click();
  });
}

/** A toggle list, or a heading that folds. */
const isToggleKind = (type: string, props?: Record<string, unknown>) => type === 'toggleListItem' || (type === 'heading' && props?.['isToggleable'] === true);

/** Notion's Markdown starts that BlockNote maps differently (NB-16): "> " makes a toggle (a '"' still makes a quote). */
const notionShortcuts = createExtension({
  key: 'notion-shortcuts',
  inputRules: [
    {
      find: /^>\s$/,
      replace: ({ editor }) => {
        openToggle((editor as unknown as { getTextCursorPosition: () => { block: { id: string } } }).getTextCursorPosition().block.id);
        return { type: 'toggleListItem', props: {} };
      },
    },
  ],
  // NB-23: Ctrl+Shift+↑/↓ moves the block holding the caret one row.
  keyboardShortcuts: {
    // NB-21: Backspace at the start of a heading merges it into the block above, which keeps its
    // type (BlockNote would first turn the heading into a paragraph). Turning it into a paragraph
    // here and passing the key on lets BlockNote's own merge run on the paragraph.
    Backspace: ({ editor }) => {
      const ed = editor as unknown as {
        prosemirrorState: { selection: { empty: boolean; $from: { parentOffset: number } } };
        getTextCursorPosition: () => { block: { type: string; props: Record<string, unknown> }; prevBlock?: unknown };
        updateBlock: (b: unknown, u: unknown) => void;
      };
      const sel = ed.prosemirrorState.selection;
      if (!sel.empty || sel.$from.parentOffset !== 0) return false;
      const at = ed.getTextCursorPosition();
      if (at.block.type !== 'heading' || at.block.props.isToggleable || !at.prevBlock) return false;
      ed.updateBlock(at.block, { type: 'paragraph', props: {} });
      return false;
    },
    // NB-26: Ctrl+Enter ticks (or unticks) the to-do holding the caret.
    'Mod-Enter': ({ editor }) => {
      const ed = editor as unknown as { getTextCursorPosition: () => { block: { type: string; props: Record<string, unknown> } }; updateBlock: (b: unknown, u: unknown) => void };
      const { block } = ed.getTextCursorPosition();
      if (block.type !== 'checkListItem') return false;
      ed.updateBlock(block, { props: { checked: !block.props.checked } });
      return true;
    },
    'Mod-Shift-ArrowUp': ({ editor }) => {
      (editor as unknown as { moveBlocksUp: () => void }).moveBlocksUp();
      return true;
    },
    'Mod-Shift-ArrowDown': ({ editor }) => {
      (editor as unknown as { moveBlocksDown: () => void }).moveBlocksDown();
      return true;
    },
  },
});
type SlashItem = Omit<DefaultSuggestionItem, 'key'> & { key: string };

/**
 * NB-04: the handle sits on the block's first line, for every kind of block (Notion: its centre
 * 2 px below the line's). BlockNote aligns it to the block's top with offsets for its own heading
 * sizes, which ours (Notion's paddings) don't share, so this replaces its middleware.
 */
const onFirstLine = {
  name: 'rcFirstLine',
  fn: ({ y, elements, rects }: { y: number; elements: { reference: unknown }; rects: { floating: { height: number } } }) => {
    // BlockNote positions against a virtual element whose contextElement is the block's DOM.
    const raw = elements.reference as { contextElement?: unknown } | Element;
    const ref = raw instanceof Element ? raw : raw?.contextElement;
    if (!(ref instanceof Element)) return {};
    const inline = ref.querySelector('.bn-inline-content');
    if (!inline) return {}; // blocks without text (a canvas, an image) keep the top
    const lineHeight = parseFloat(getComputedStyle(inline).lineHeight) || 24;
    const middle = inline.getBoundingClientRect().top + lineHeight / 2 - ref.getBoundingClientRect().top;
    return { y: y + middle - rects.floating.height / 2 + 2 };
  },
};

// ── The side menu: "+" and the grip, Notion's sizes (24 and 18×24) ─────────────────────────

function RcSideMenu() {
  const editor = useBlockNoteEditor() as unknown as Editor;
  const sideMenu = useExtension(SideMenuExtension);
  const suggestions = useExtension(SuggestionMenu);
  const block = useExtensionState(SideMenuExtension, { selector: (s) => s?.block });
  const [menuOpen, setMenuOpen] = useState(false);
  // Notion's two-line tooltip on the grip, after a 250 ms rest (NB-05); never while its menu is open.
  const [tip, setTip] = useState(false);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTipSoon = () => {
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setTip(true), 250);
  };
  const hideTip = () => {
    if (tipTimer.current) clearTimeout(tipTimer.current);
    setTip(false);
  };
  if (!block) return null;

  const add = () => {
    const content = (block as { content?: unknown }).content;
    if (Array.isArray(content) && content.length === 0) {
      editor.setTextCursorPosition(block);
    } else {
      const [inserted] = editor.insertBlocks([{ type: 'paragraph' }], block, 'after');
      if (inserted) editor.setTextCursorPosition(inserted);
    }
    suggestions.openSuggestionMenu('/');
  };

  const closeMenu = () => {
    setMenuOpen(false);
    sideMenu.unfreezeMenu();
    document.querySelectorAll('.lab-editor [data-menu-open]').forEach((el) => el.removeAttribute('data-menu-open'));
  };
  const turnInto = (type: string, props?: Record<string, unknown>) => {
    if (isToggleKind(type, props)) openToggle(block.id);
    editor.updateBlock(block, { type, props } as never);
    closeMenu();
  };

  return (
    <div className="lab-side" data-open={menuOpen || undefined}>
      <button type="button" className="lab-side-btn lab-side-add" aria-label="Add a block below" title="Click to add below" onClick={add}>
        <Plus aria-hidden />
      </button>
      <button
        type="button"
        className="lab-side-btn lab-side-grip"
        aria-label="Drag to move, click to open menu"
        draggable
        onMouseEnter={showTipSoon}
        onMouseLeave={hideTip}
        onDragStart={(e) => {
          hideTip();
          sideMenu.blockDragStart(e, block);
          // NB-08: the ghost keeps the grab offset, as if the block were held by its grip
          // (BlockNote pins the ghost's corner to the pointer; its preview has 10 px of padding).
          const el = document.querySelector(`.lab-editor [data-node-type="blockContainer"][data-id="${block.id}"]`);
          const preview = document.querySelector('.bn-drag-preview');
          if (el && preview instanceof HTMLElement && e.dataTransfer) {
            const r = el.getBoundingClientRect();
            e.dataTransfer.setDragImage(preview, Math.round(e.clientX - r.left + 10), Math.round(e.clientY - r.top + 10));
          }
        }}
        onDragEnd={() => sideMenu.blockDragEnd()}
        onClick={() => {
          hideTip();
          const next = !menuOpen;
          setMenuOpen(next);
          // While its menu is open the block shows the selection tint (Notion); BlockNote has no
          // one-block selection, so the block's element carries a data flag instead.
          document.querySelectorAll('.lab-editor [data-menu-open]').forEach((el) => el.removeAttribute('data-menu-open'));
          if (next) {
            sideMenu.freezeMenu();
            document.querySelector(`.lab-editor [data-node-type="blockContainer"][data-id="${block.id}"]`)?.setAttribute('data-menu-open', '');
          } else sideMenu.unfreezeMenu();
        }}
      >
        <GripVertical aria-hidden />
      </button>
      {tip && !menuOpen && (
        <div className="lab-tip" role="tooltip">
          <span>
            <b>Drag</b> to move
          </span>
          <span>
            <b>Click</b> to open menu
          </span>
        </div>
      )}
      {menuOpen && (
        <BlockMenu
          onTurnInto={turnInto}
          onDuplicate={() => {
            const copy = { ...(block as object) } as Record<string, unknown>;
            delete copy.id;
            editor.insertBlocks([copy as never], block, 'after');
            closeMenu();
          }}
          onDelete={() => {
            editor.removeBlocks([block]);
            closeMenu();
          }}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}

// ── The grip's block menu (NB-07): a focused "Search actions…" field, Turn into, Duplicate, Delete ─

const TURN_INTO = [
  ['paragraph', 'Text', Type, undefined],
  ['heading', 'Heading 1', Heading1, { level: 1, isToggleable: false }],
  ['heading', 'Heading 2', Heading2, { level: 2, isToggleable: false }],
  ['heading', 'Heading 3', Heading3, { level: 3, isToggleable: false }],
  ['heading', 'Heading 4', Heading4, { level: 4, isToggleable: false }],
  ['bulletListItem', 'Bulleted list', List, undefined],
  ['numberedListItem', 'Numbered list', ListOrdered, undefined],
  ['checkListItem', 'To-do list', ListChecks, undefined],
  ['toggleListItem', 'Toggle list', ListCollapse, undefined],
  ['heading', 'Toggle heading 1', ListCollapse, { level: 1, isToggleable: true }],
  ['heading', 'Toggle heading 2', ListCollapse, { level: 2, isToggleable: true }],
  ['heading', 'Toggle heading 3', ListCollapse, { level: 3, isToggleable: true }],
  ['quote', 'Quote', Quote, undefined],
] as const;

const TURN_INTO_ENTRIES = TURN_INTO.map(([type, label, Icon, props]) => ({ type, label, Icon, props: props as Record<string, unknown> | undefined }));

/** The words for a block's kind that Turn into doesn't offer (the phone bar's label). */
const KIND_NAMES: Record<string, string> = { codeBlock: 'Code', image: 'Image', callout: 'Callout', canvas: 'Canvas', diagram: 'Diagram', table: 'Table', divider: 'Divider' };
const kindName = (block: { type: string; props: Record<string, unknown> }) =>
  turnIntoLabel(block) ?? (block.type === 'heading' ? `Heading ${Number(block.props['level'] ?? 1)}` : KIND_NAMES[block.type] ?? 'Block');

/** The Turn into entry a block is now (a heading by its level and whether it folds). */
function turnIntoLabel(block: { type: string; props: Record<string, unknown> } | undefined): string | undefined {
  if (!block) return undefined;
  return TURN_INTO.find(([type, , , props]) => {
    if (type !== block.type) return false;
    if (!props) return true;
    const p = props as { level: number; isToggleable: boolean };
    return p.level === Number(block.props['level'] ?? 1) && p.isToggleable === Boolean(block.props['isToggleable']);
  })?.[1];
}

function BlockMenu({ onTurnInto, onDuplicate, onDelete, onClose }: { onTurnInto: (type: string, props?: Record<string, unknown>) => void; onDuplicate: () => void; onDelete: () => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const q = query.trim().toLowerCase();
  const items = [
    ...TURN_INTO.map(([type, label, Icon, props]) => ({ key: `turn-${label}`, group: 'Turn into', label, Icon, hint: '', run: () => onTurnInto(type, props as Record<string, unknown> | undefined) })),
    { key: 'duplicate', group: 'Actions', label: 'Duplicate', Icon: Copy, hint: 'Ctrl+D', run: onDuplicate },
    { key: 'delete', group: 'Actions', label: 'Delete', Icon: Trash2, hint: 'Del', run: onDelete },
  ].filter((i) => !q || i.label.toLowerCase().includes(q) || (i.group === 'Turn into' && 'turn into'.includes(q)));
  const at = Math.min(active, Math.max(0, items.length - 1));
  return (
    <div className="lab-menu lab-block-menu" role="menu" aria-label="Block actions">
      <input
        autoFocus
        className="lab-menu-search"
        placeholder="Search actions…"
        aria-label="Search actions"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (items.length ? (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length : 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            items[at]?.run();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      />
      {items.length === 0 && <p className="lab-menu-label">No action matches</p>}
      {items.map((item, i) => (
        <div key={item.key}>
          {item.group !== items[i - 1]?.group && <p className="lab-menu-label">{item.group}</p>}
          <button type="button" role="menuitem" className="lab-menu-item" data-selected={i === at || undefined} onMouseEnter={() => setActive(i)} onClick={item.run}>
            <item.Icon aria-hidden />
            <span>{item.label}</span>
            {item.hint && <kbd>{item.hint}</kbd>}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── The slash menu: Notion's rows, our icons, the Markdown shortcut as the hint ────────────

const ICONS: Record<string, React.ComponentType<{ 'aria-hidden'?: boolean; className?: string }>> = {
  paragraph: Type,
  heading: Heading1,
  heading_2: Heading2,
  heading_3: Heading3,
  heading_4: Heading4,
  toggle_heading: ListCollapse,
  toggle_heading_2: ListCollapse,
  toggle_heading_3: ListCollapse,
  bullet_list: List,
  numbered_list: ListOrdered,
  check_list: ListChecks,
  toggle_list: ListCollapse,
  quote: Quote,
  code_block: CodeXml,
  table: Table,
  image: ImageIcon,
  divider: Minus,
  canvas: PanelsTopLeft,
  callout: Lightbulb,
  diagram: Workflow,
  ask_ai: KaagaIcon,
  // DOC_PAGES_PLAN §5: a page inside this doc, and a block for a doc he already has.
  page: FileText,
  link_page: FileSymlink,
};

function RcSlashMenu({ items, selectedIndex, onItemClick }: SuggestionMenuProps<SlashItem>) {
  if (!items.length) return null;
  return (
    <div className={cn(rcScope, 'lab-menu lab-slash')} role="listbox" aria-label="Blocks">
      {items.map((item, i) => {
        const Icon = ICONS[item.key] ?? Type;
        const head = item.group && item.group !== items[i - 1]?.group ? item.group : null;
        return (
          <div key={`${item.key}-${item.title}`}>
            {head && <p className="lab-menu-label">{head}</p>}
            <button
              type="button"
              role="option"
              aria-selected={i === selectedIndex}
              className="lab-menu-item"
              data-selected={i === selectedIndex || undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onItemClick?.(item)}
              ref={(el) => {
                if (el && i === selectedIndex) el.scrollIntoView({ block: 'nearest' });
              }}
            >
              <Icon aria-hidden />
              <span>{item.title}</span>
              {item.badge && <kbd>{item.badge}</kbd>}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── The format bar: a horizontal bar above the selection (our DESIGN log; Notion 2026 differs) ─

function RcFormatBar() {
  const editor = useBlockNoteEditor() as unknown as Editor;
  const openAsk = useContext(AskContext);
  const styles = editor.getActiveStyles() as Record<string, unknown>;
  const mark = (key: 'bold' | 'italic' | 'underline' | 'strike' | 'code', Icon: typeof Bold, label: string) => (
    <button
      type="button"
      className="lab-bar-btn"
      aria-label={label}
      aria-pressed={!!styles[key]}
      data-on={styles[key] ? true : undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => editor.toggleStyles({ [key]: true } as never)}
    >
      <Icon aria-hidden />
    </button>
  );
  return (
    <div className={cn(rcScope, 'lab-bar')} role="toolbar" aria-label="Format">
      {openAsk && (
        <>
          <button type="button" className="lab-bar-btn lab-bar-ask" title="Ask Kaaga (Ctrl+J)" onMouseDown={(e) => e.preventDefault()} onClick={openAsk}>
            <KaagaIcon />
            <span>Ask Kaaga</span>
          </button>
          <span className="lab-bar-sep" aria-hidden />
        </>
      )}
      <TurnIntoButton editor={editor} />
      <span className="lab-bar-sep" aria-hidden />
      {mark('bold', Bold, 'Bold')}
      {mark('italic', Italic, 'Italic')}
      {mark('underline', Underline, 'Underline')}
      {mark('strike', Strikethrough, 'Strikethrough')}
      {mark('code', Code, 'Code')}
      <button
        type="button"
        className="lab-bar-btn"
        aria-label="Link"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const url = window.prompt('Link to');
          if (url) editor.createLink(url);
        }}
      >
        <Link2 aria-hidden />
      </button>
      <ColorButton editor={editor} text={(styles.textColor as string) || 'default'} background={(styles.backgroundColor as string) || 'default'} />
    </div>
  );
}

/** The selection bar's block kind ("Text ▾", Notion's first control): the grip menu's Turn into, for the selected blocks. */
function TurnIntoButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  type Picked = { id: string; type: string; props: Record<string, unknown> };
  const picked = (): Picked[] => (editor.getSelection() as { blocks: Picked[] } | undefined)?.blocks ?? [editor.getTextCursorPosition().block as unknown as Picked];
  const first = picked()[0];
  // H5 and H6 come only from Markdown (agents): they aren't offered, but the button still names them.
  const current = turnIntoLabel(first) ?? (first?.type === 'heading' ? `Heading ${Number(first.props['level'] ?? 1)}` : 'Text');
  const turn = (type: string, props?: Record<string, unknown>) => {
    for (const b of picked()) {
      if (isToggleKind(type, props)) openToggle(b.id);
      editor.updateBlock(b.id, { type, props } as never);
    }
    setOpen(false);
  };
  return (
    <span className="lab-turn">
      <button
        type="button"
        className="lab-bar-btn lab-bar-turn"
        aria-label={`Turn into (now ${current})`}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{current}</span>
        <ChevronDown aria-hidden />
      </button>
      {open && (
        <div className="lab-menu lab-turn-menu" role="menu" aria-label="Turn into">
          <p className="lab-menu-label">Turn into</p>
          {TURN_INTO.map(([type, label, Icon, props]) => (
            <button key={label} type="button" role="menuitem" className="lab-menu-item" onMouseDown={(e) => e.preventDefault()} onClick={() => turn(type, props as Record<string, unknown> | undefined)}>
              <Icon aria-hidden />
              <span>{label}</span>
              {label === current && <Check className="lab-check" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/**
 * Text and background colour, Notion's families in our tints (lab-editor.css). No purple to pick: in
 * this app purple is the date the system sets (DESIGN.md); a purple already in a doc still shows.
 */
const COLORS = [
  ['default', 'Default'],
  ['gray', 'Gray'],
  ['brown', 'Brown'],
  ['orange', 'Orange'],
  ['yellow', 'Yellow'],
  ['green', 'Green'],
  ['blue', 'Blue'],
  ['pink', 'Pink'],
  ['red', 'Red'],
] as const;

function ColorButton({ editor, text, background }: { editor: Editor; text: string; background: string }) {
  const [open, setOpen] = useState(false);
  const pick = (key: 'textColor' | 'backgroundColor', value: string) => {
    if (value === 'default') editor.removeStyles({ [key]: key === 'textColor' ? text : background } as never);
    else editor.addStyles({ [key]: value } as never);
    setOpen(false);
  };
  const row = (key: 'textColor' | 'backgroundColor', value: string, label: string, current: string) => (
    <button
      key={`${key}-${value}`}
      type="button"
      role="menuitemradio"
      aria-checked={current === value}
      className="lab-menu-item"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => pick(key, value)}
    >
      <span
        className={cn('lab-swatch', key === 'backgroundColor' && 'lab-swatch--bg')}
        {...(value === 'default' ? {} : key === 'textColor' ? { 'data-text-color': value } : { 'data-background-color': value })}
        aria-hidden
      >
        {key === 'textColor' ? 'A' : ''}
      </span>
      <span>{key === 'textColor' ? label : value === 'default' ? 'Default background' : `${label} background`}</span>
      {current === value && <Check className="lab-check" aria-hidden />}
    </button>
  );
  const colored = text !== 'default' || background !== 'default';
  return (
    <span className="lab-color">
      <button
        type="button"
        className="lab-bar-btn"
        aria-label="Color"
        aria-haspopup="menu"
        aria-expanded={open}
        data-on={colored || undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        <Baseline aria-hidden />
      </button>
      {open && (
        <div className="lab-menu lab-color-menu" role="menu" aria-label="Color">
          <p className="lab-menu-label">Text color</p>
          {COLORS.map(([value, label]) => row('textColor', value, label, text))}
          <p className="lab-menu-label">Background</p>
          {COLORS.map(([value, label]) => row('backgroundColor', value, label, background))}
        </div>
      )}
    </span>
  );
}

/** Markdown → our blocks (the server converts it), inserted after the caret's block (or in place of an empty one). */
async function pasteMarkdown(editor: Editor, ydoc: Y.Doc, text: string) {
  const at = editor.getTextCursorPosition().block as { id: string; type: string; content?: unknown };
  try {
    const { blocks, boards } = await agentApi.markdownToEditorBlocks(text);
    if (!blocks.length) return;
    for (const [canvasId, board] of Object.entries(boards)) writeBoard(ydoc, canvasId, sanitizeBoard(board));
    const empty = at.type === 'paragraph' && Array.isArray(at.content) && at.content.length === 0;
    const made = (empty ? editor.replaceBlocks([at.id], blocks as never).insertedBlocks : editor.insertBlocks(blocks as never, at.id, 'after')) as { id: string }[];
    const last = made[made.length - 1];
    if (last) editor.setTextCursorPosition(last.id, 'end');
  } catch {
    editor.insertInlineContent(text);
  }
}

// ── The editor ───────────────────────────────────────────────────────────────────────────

export function LabEditor({
  ydoc,
  provider,
  user,
  editable = true,
  docId,
  onEditor,
  canAddPages = false,
  onPages,
}: {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  user: { name: string; color: string };
  editable?: boolean;
  docId?: string;
  /** The editor, once made (the doc page drives the title's Enter and ↓ through it). */
  onEditor?: (editor: Editor) => void;
  /** DOC_PAGES_PLAN §5: "/page" makes a page inside this doc (the owner's). */
  canAddPages?: boolean;
  /** The pages this doc's page blocks point at, live (the Pages list leaves those out). */
  onPages?: (ids: string[]) => void;
}) {
  const fragment = useMemo(() => ydoc.getXmlFragment('blocks'), [ydoc]);
  // Spike only: let the QA script look at the Y.Doc and the provider.
  // Notion's drop rules (NB-09 to NB-11): above/below by the row's half, nesting by the drag's offset.
  // One instance per editor: the editor below is re-created when these change, so this is too.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const blockDrop = useMemo(() => createBlockDrop(), [fragment, provider]);
  // BlockNote 0.57: collaboration is an extension added by withCollaboration (the Yjs 13 entry).
  const editor = useCreateBlockNote(
    withCollaboration({
      schema: docSchema,
      collaboration: { fragment, user, provider: provider ? { awareness: provider.awareness ?? undefined } : undefined, showCursorLabels: 'activity' },
      dropCursor: { width: 4, color: 'rgba(35, 131, 226, 0.43)', hooks: { computeDropPosition: blockDrop.hook as never } },
      sideMenu: { hoverMargin: 60 },
      trailingBlock: true,
      extensions: [notionShortcuts, blockDrop.extension, syntaxHighlighting],
      // Pasted Markdown (a note from a chat) becomes our blocks through the server's dialect: callouts,
      // toggles, ```mermaid diagrams and ```canvas boards, as agents write them. Inside code or a
      // diagram, and anything with HTML on the clipboard, BlockNote pastes as it does.
      pasteHandler: ({ event, editor: ed, defaultPasteHandler }: { event: ClipboardEvent; editor: unknown; defaultPasteHandler: () => boolean | undefined }) => {
        const text = event.clipboardData?.getData('text/plain') ?? '';
        const html = event.clipboardData?.getData('text/html') ?? '';
        const current = (ed as Editor).getTextCursorPosition().block as { type: string };
        if (html || current.type === 'codeBlock' || current.type === 'diagram' || !looksLikeMarkdown(text)) return defaultPasteHandler();
        void pasteMarkdown(ed as Editor, fragment.doc!, text);
        return true;
      },
      // Pasted or dropped images go to Cloudinary through the app's upload route, as in the old editor.
      uploadFile: async (file: File) => {
        const res = await uploadToCloud(file, docId, newImageId());
        if (!res?.url) throw new Error('The image did not upload.');
        return res.url;
      },
    }),
    [fragment, provider],
  ) as unknown as Editor;

  useEffect(() => {
    onEditor?.(editor);
  }, [editor, onEditor]);

  // DOC_PAGES_PLAN §5: which pages have a block here, as the doc changes (here or in another tab).
  useEffect(() => {
    if (!onPages) return;
    // Told only when the set changes (not on every keystroke).
    let last: string | null = null;
    const read = () => {
      const ids: string[] = [];
      const walk = (blocks: readonly { type: string; props?: Record<string, unknown>; children?: readonly unknown[] }[]) => {
        for (const b of blocks) {
          if (b.type === 'page' && typeof b.props?.['docId'] === 'string' && b.props['docId']) ids.push(b.props['docId']);
          if (b.children?.length) walk(b.children as never);
        }
      };
      walk(editor.document as never);
      const key = ids.join(',');
      if (key === last) return;
      last = key;
      onPages(ids);
    };
    read();
    const off = (editor as unknown as { onChange: (cb: () => void) => (() => void) | void }).onChange(read);
    return typeof off === 'function' ? off : undefined;
  }, [editor, onPages]);
  const router = useRouter();

  // DOC_PAGES_PLAN §5 "Link to page": the line the slash menu was on, while the picker is open.
  const [linkAt, setLinkAt] = useState<{ blockId: string; empty: boolean } | null>(null);
  const placeLink = useCallback(
    (doc: { _id: string }) => {
      const at = linkAt;
      setLinkAt(null);
      if (!at) return;
      const block = { type: 'page', props: { docId: doc._id } } as never;
      let made: string | undefined;
      try {
        if (at.empty) {
          editor.updateBlock(at.blockId, block);
          made = at.blockId;
        } else made = (editor.insertBlocks([block], at.blockId, 'after') as { id: string }[])[0]?.id;
      } catch {
        // The line went meanwhile (another tab): the block goes at the end.
        const last = editor.document[editor.document.length - 1];
        if (last) made = (editor.insertBlocks([block], last.id, 'after') as { id: string }[])[0]?.id;
      }
      if (!made) {
        toast.error('The link was not added. Try again.');
        return;
      }
      // The caret on the line after the block (a new empty one when the next isn't a text line).
      const placed = made;
      requestAnimationFrame(() => {
        try {
          const next = editor.getNextBlock(placed) as { id: string; type: string } | undefined;
          const line = next && next.type === 'paragraph' ? next.id : (editor.insertBlocks([{ type: 'paragraph' } as never], placed, 'after') as { id: string }[])[0]?.id;
          if (line) editor.setTextCursorPosition(line, 'start');
          editor.focus();
        } catch {
          editor.focus();
        }
      });
    },
    [editor, linkAt],
  );

  // Tests read the block tree and the live doc from here (tests/editor/ and the QA scripts).
  useEffect(() => {
    Object.assign(window as unknown as Record<string, unknown>, { __labEditor: editor, __labYdoc: ydoc, __labProvider: provider });
  }, [editor, ydoc, provider]);

  // Notion's block selection (Esc, arrows, Shift+arrows, Ctrl+D, Backspace) over the editor.
  const rootRef = useRef<HTMLDivElement>(null);
  const blockSelection = useBlockSelection(editor as never, rootRef, editable);

  // Ask Kaaga inside the doc (DOCS_EDITOR_V2_PLAN phase 5): Ctrl+J, the format bar, or /ai. What he
  // points at is read when the box opens: selected blocks, a text selection, or the cursor's block.
  const [ask, setAsk] = useState<(AskFocus & { key: number }) | null>(null);
  const canAsk = editable && !!docId;
  const openAsk = useCallback(() => {
    if (!canAsk) return;
    type Picked = { id: string; type: string; content?: unknown; children?: unknown[] };
    const picked = blockSelection.selected();
    let focus: AskFocus;
    if (picked.length) {
      blockSelection.clear();
      focus = { blockIds: picked, selection: true, emptyLine: false };
    } else {
      const words = editor.getSelectedText().trim();
      const sel = words ? (editor.getSelection() as { blocks: Picked[] } | undefined) : undefined;
      if (sel?.blocks.length) {
        focus = { blockIds: sel.blocks.map((b) => b.id), text: sel.blocks.length === 1 ? words : undefined, selection: true, emptyLine: false };
      } else {
        const at = editor.getTextCursorPosition().block as unknown as Picked;
        const empty = at.type === 'paragraph' && Array.isArray(at.content) && at.content.length === 0 && !(at.children ?? []).length;
        focus = { blockIds: [at.id], selection: false, emptyLine: empty };
      }
    }
    setAsk({ ...focus, key: Date.now() });
  }, [canAsk, editor, blockSelection]);
  const closeAsk = useCallback(
    (caretAt: string | null) => {
      setAsk(null);
      if (!caretAt) return;
      requestAnimationFrame(() => {
        try {
          editor.setTextCursorPosition(caretAt, 'end');
        } catch {
          // a block without text (a board, an image): the editor just takes focus
        }
        editor.focus();
      });
    },
    [editor],
  );
  useEffect(() => {
    if (!canAsk) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'j') return;
      const el = rootRef.current;
      const inDoc = !!el && (el.contains(document.activeElement) || !!el.querySelector('[data-block-selected]'));
      if (!inDoc) return;
      // Inside the box it is already open (and the browser's own Ctrl+J stays shut).
      e.preventDefault();
      if (!(document.activeElement as HTMLElement | null)?.closest('.doc-ask')) openAsk();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [canAsk, openAsk]);
  // While the box is open the block handle stays away.
  useEffect(() => {
    if (!ask) return;
    document.body.classList.add('doc-asking');
    return () => document.body.classList.remove('doc-asking');
  }, [ask]);

  const getItems = async (query: string): Promise<SlashItem[]> => {
    // BlockNote's own items, renamed to Notion's words with the Markdown start as the hint (0a),
    // in Notion's order. Heading 4 and the toggle headings are in (H5–H6 come only from Markdown);
    // video, audio, file and emoji are left out (the owner, 11-15: later, or not at all).
    const byKey = new Map((getDefaultSlashMenuItems(editor) as SlashItem[]).map((i) => [i.key, i]));
    const take = (key: string, title: string, group: string, badge?: string, aliases: string[] = []): SlashItem[] => {
      const item = byKey.get(key);
      return item ? [{ ...item, title, group, badge, aliases: [...(item.aliases ?? []), ...aliases] }] : [];
    };
    // A toggle made here starts open (openToggle): the block he is on when it turns into one, or the new block the menu inserts.
    const opening = (items: SlashItem[]): SlashItem[] =>
      items.map((item) => ({
        ...item,
        onItemClick: () => {
          const before = editor.getTextCursorPosition().block.id;
          openToggle(before);
          item.onItemClick();
          const now = editor.getTextCursorPosition().block.id;
          if (now !== before) openToggle(now);
        },
      }));
    const canvas: SlashItem = {
      key: 'canvas',
      title: 'Canvas',
      subtext: 'A board of boxes and arrows',
      aliases: ['board', 'whiteboard', 'boxes'],
      group: 'Advanced',
      onItemClick: () => {
        const at = editor.getTextCursorPosition().block;
        editor.insertBlocks([{ type: 'canvas', props: { canvasId: newCanvasId(), height: 440 } } as never], at, 'after');
      },
    };
    const diagram: SlashItem = {
      key: 'diagram',
      title: 'Diagram',
      subtext: 'A Mermaid diagram: flowchart, sequence, ER…',
      aliases: ['mermaid', 'flowchart', 'sequence', 'chart', 'graph', 'er'],
      group: 'Advanced',
      badge: '```mermaid',
      onItemClick: () => {
        const at = editor.getTextCursorPosition().block;
        const empty = Array.isArray((at as { content?: unknown }).content) && (at as { content: unknown[] }).content.length === 0;
        const made = empty ? (editor.updateBlock(at, { type: 'diagram' } as never), at) : editor.insertBlocks([{ type: 'diagram' } as never], at, 'after')[0];
        if (made) editor.setTextCursorPosition(made, 'end');
      },
    };
    const callout: SlashItem = {
      key: 'callout',
      title: 'Callout',
      subtext: 'A note, tip, warning…',
      aliases: ['note', 'tip', 'warning', 'info', 'caution', 'important'],
      group: 'Basic blocks',
      onItemClick: () => {
        const at = editor.getTextCursorPosition().block;
        const empty = Array.isArray((at as { content?: unknown }).content) && ((at as { content: unknown[] }).content.length === 0);
        if (empty) editor.updateBlock(at, { type: 'callout', props: { kind: 'note' } } as never);
        else editor.insertBlocks([{ type: 'callout', props: { kind: 'note' } } as never], at, 'after');
      },
    };
    // DOC_PAGES_PLAN §5: "/page": a new page inside this doc, placed here, then opened (its title waits for typing).
    const pageItem: SlashItem = {
      key: 'page',
      title: 'Page',
      subtext: 'A new page inside this doc',
      aliases: ['subpage', 'sub-page', 'nested', 'child'],
      group: 'Basic blocks',
      onItemClick: () => {
        if (!docId) return;
        const at = editor.getTextCursorPosition().block;
        const empty = Array.isArray((at as { content?: unknown }).content) && (at as { content: unknown[] }).content.length === 0;
        void docApi
          .createDoc({ title: 'Untitled', parentId: docId })
          .then(async (res) => {
            const id = res.data?._id;
            if (!id) throw new Error('no id');
            const block = { type: 'page', props: { docId: id } } as never;
            if (empty) editor.updateBlock(at, block);
            else editor.insertBlocks([block], at, 'after');
            // The block reaches the server before the page leaves (at most 2 s).
            for (let i = 0; i < 20 && (provider?.unsyncedChanges ?? 0) > 0; i++) await new Promise((r) => setTimeout(r, 100));
            router.push(`/docs/${id}?new=1`);
          })
          .catch(() => toast.error('The page was not made. Try again.'));
      },
    };
    // "Link to page": a block for a doc he already has (a picker of his docs; the doc stays where it is).
    const linkItem: SlashItem = {
      key: 'link_page',
      title: 'Link to page',
      subtext: 'A doc you already have, shown here',
      aliases: ['link', 'link to doc', 'page link', 'existing page', 'mention page'],
      group: 'Basic blocks',
      onItemClick: () => {
        const at = editor.getTextCursorPosition().block;
        const empty = Array.isArray((at as { content?: unknown }).content) && (at as { content: unknown[] }).content.length === 0;
        setLinkAt({ blockId: at.id, empty });
      },
    };
    const askAi: SlashItem = {
      key: 'ask_ai',
      title: 'Ask Kaaga',
      subtext: 'Write, edit or explain with AI',
      aliases: ['ai', 'ask', 'write', 'claude', 'assistant'],
      group: 'AI',
      badge: 'Ctrl+J',
      onItemClick: () => openAsk(),
    };
    const items = [
      ...(canAsk ? [askAi] : []),
      ...(canAddPages && docId ? [pageItem, linkItem] : []),
      ...take('paragraph', 'Text', 'Basic blocks', undefined, ['text', 'plain']),
      ...take('heading', 'Heading 1', 'Basic blocks', '#', ['h1', 'title']),
      ...take('heading_2', 'Heading 2', 'Basic blocks', '##', ['h2']),
      ...take('heading_3', 'Heading 3', 'Basic blocks', '###', ['h3']),
      ...take('heading_4', 'Heading 4', 'Basic blocks', '####', ['h4']),
      ...take('bullet_list', 'Bulleted list', 'Basic blocks', '-', ['bulleted', 'bullet']),
      ...take('numbered_list', 'Numbered list', 'Basic blocks', '1.', ['numbered']),
      ...take('check_list', 'To-do list', 'Basic blocks', '[]', ['todo', 'to-do', 'checkbox', 'task']),
      ...opening(take('toggle_list', 'Toggle list', 'Basic blocks', '>', ['toggle', 'collapse', 'details'])),
      ...opening(take('toggle_heading', 'Toggle heading 1', 'Basic blocks', undefined, ['toggle h1', 'toggle heading', 'collapsible'])),
      ...opening(take('toggle_heading_2', 'Toggle heading 2', 'Basic blocks', undefined, ['toggle h2', 'toggle heading', 'collapsible'])),
      ...opening(take('toggle_heading_3', 'Toggle heading 3', 'Basic blocks', undefined, ['toggle h3', 'toggle heading', 'collapsible'])),
      ...take('quote', 'Quote', 'Basic blocks', '"', ['blockquote']),
      ...take('divider', 'Divider', 'Basic blocks', '---', ['hr', 'line', 'separator']),
      callout,
      ...take('image', 'Image', 'Media', undefined, ['picture', 'photo', 'img']),
      ...take('table', 'Table', 'Advanced', undefined, ['grid', 'rows', 'columns']),
      ...take('code_block', 'Code', 'Advanced', '```', ['code block', 'snippet']),
      diagram,
      canvas,
    ];
    return filterSuggestionItems(items, query);
  };

  return (
    <BlockDocContext.Provider value={ydoc}>
      <AskContext.Provider value={canAsk ? openAsk : null}>
        <div ref={rootRef} className={cn(rcScope, 'lab-editor')}>
          <BlockNoteViewRaw editor={editor as never} editable={editable} sideMenu={false} slashMenu={false} formattingToolbar={false} linkToolbar={false} filePanel={false} tableHandles={false} emojiPicker={false}>
            <SideMenuController sideMenu={RcSideMenu} floatingUIOptions={{ useFloatingOptions: { middleware: [onFirstLine] } } as never} />
            <SuggestionMenuController triggerCharacter="/" getItems={getItems} suggestionMenuComponent={RcSlashMenu} onItemClick={(item: SlashItem) => item.onItemClick()} />
            <FormattingToolbarController formattingToolbar={RcFormatBar} />
            <FilePanelController filePanel={RcFilePanel} />
            {editable && <TableHandlesController tableHandle={RcTableHandle as never} extendButton={RcTableExtend as never} tableCellHandle={NoCellHandle} />}
          </BlockNoteViewRaw>
          {docId && canAddPages && (
            <LinkPageDialog
              open={!!linkAt}
              onOpenChange={(o) => {
                if (o) return;
                setLinkAt(null);
                editor.focus();
              }}
              docId={docId}
              onPick={placeLink}
            />
          )}
          {ask && docId && <DocAsk key={ask.key} editor={editor as unknown as DocAskEditor} ydoc={ydoc} docId={docId} focus={ask} onClose={closeAsk} />}
          {editable && !ask && (
            <PhoneBlockBar
              editor={editor as unknown as PhoneBarEditor}
              root={rootRef}
              turnInto={TURN_INTO_ENTRIES}
              kindOf={kindName}
              onTurn={(block, type, props) => {
                if (isToggleKind(type, props)) openToggle(block.id);
                editor.updateBlock(block.id, { type, props } as never);
              }}
              onAsk={canAsk ? openAsk : null}
            />
          )}
        </div>
      </AskContext.Provider>
    </BlockDocContext.Provider>
  );
}
