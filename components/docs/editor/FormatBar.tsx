'use client';

import { useEditorState, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { TextSelection } from '@tiptap/pm/state';
import { Bold, Check, ChevronDown, Code, Highlighter, Italic, Link2, Strikethrough, Underline, Unlink } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { rcScope } from '@/components/rc-ui';
import { RcPicker } from '@/components/rc-ui/RcPicker';
import { TURN_INTO_TYPES, activeBlockType } from '@/lib/editor/blockTypes';

/** Highlight tints: the theme's status tints, so marks read in light and dark. */
const HIGHLIGHTS = [
  { value: 'var(--doc-mark-yellow)', label: 'Yellow' },
  { value: 'var(--doc-mark-green)', label: 'Green' },
  { value: 'var(--doc-mark-red)', label: 'Red' },
];

/** Only for text you selected: not while a block is dragged, and not for a whole selected block. */
const shouldShow: NonNullable<ComponentProps<typeof BubbleMenu>['shouldShow']> = ({ editor: e, from, to, view }) => {
  if (!e.isEditable || from === to) return false;
  if (view.dragging || !(e.state.selection instanceof TextSelection)) return false;
  if (e.isActive('codeBlock') || e.isActive('resizableImage') || e.isActive('embed')) return false;
  return !e.state.selection.empty && e.state.doc.textBetween(from, to, ' ').trim().length > 0;
};

/** The selection bar: Turn into, marks, link, highlight. Shows for a text selection only. */
export function FormatBar({ editor, scrollTarget }: { editor: Editor; scrollTarget?: HTMLElement | null }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: activeBlockType(e).id,
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      link: e.isActive('link'),
      href: (e.getAttributes('link').href as string | undefined) ?? '',
      highlight: (e.getAttributes('highlight').color as string | undefined) ?? (e.isActive('highlight') ? HIGHLIGHTS[0]!.value : ''),
    }),
  });
  const [linkMode, setLinkMode] = useState(false);
  const [href, setHref] = useState('');
  const [hlOpen, setHlOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (linkMode) {
      setHref(s.href);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the link field opens
  }, [linkMode]);

  const applyLink = () => {
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!url) chain.unsetLink().run();
    else chain.setLink({ href: /^(https?:|mailto:|\/)/i.test(url) ? url : `https://${url}` }).run();
    setLinkMode(false);
  };

  // Stable props: BubbleMenu dispatches an options update whenever these change identity.
  const options = useMemo(
    () => ({ placement: 'top' as const, offset: 8, flip: true, shift: { padding: 12 }, scrollTarget: scrollTarget ?? undefined }),
    [scrollTarget],
  );

  const block = TURN_INTO_TYPES.find((b) => b.id === s.block) ?? TURN_INTO_TYPES[0]!;
  const mark = (on: boolean, label: string, Icon: typeof Bold, run: () => void, kbd?: string) => (
    <button
      type="button"
      className="doc-bar-btn"
      aria-pressed={on}
      aria-label={label}
      title={kbd ? `${label} · ${kbd}` : label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      <Icon className="h-4 w-4" strokeWidth={on ? 2.25 : 1.75} aria-hidden />
    </button>
  );

  return (
    <BubbleMenu
      editor={editor}
      className={cn(rcScope, 'doc-bar')}
      options={options}
      shouldShow={shouldShow}
    >
      {linkMode ? (
        <div className="flex items-center gap-1 px-1">
          <input
            ref={inputRef}
            className="doc-bar-input"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="Paste a link"
            aria-label="Link address"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setLinkMode(false);
                editor.commands.focus();
              }
            }}
          />
          <button type="button" className="doc-bar-btn" aria-label="Apply link" title="Apply link" onClick={applyLink}>
            <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          {s.link && (
            <button
              type="button"
              className="doc-bar-btn"
              aria-label="Remove link"
              title="Remove link"
              onClick={() => {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                setLinkMode(false);
              }}
            >
              <Unlink className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-0.5">
          <RcPicker
            label="Turn into"
            options={TURN_INTO_TYPES.map((b) => ({ value: b.id, label: b.label, icon: <b.icon className="h-4 w-4" strokeWidth={1.75} /> }))}
            value={block.id}
            onChange={(id) => {
              const b = TURN_INTO_TYPES.find((t) => t.id === id);
              if (b) b.apply(editor.chain().focus()).run();
            }}
            searchable={false}
            width={220}
          >
            <button type="button" className="doc-bar-btn doc-bar-turn" onMouseDown={(e) => e.preventDefault()}>
              {block.label}
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          </RcPicker>
          <span className="doc-bar-sep" aria-hidden />
          {mark(s.bold, 'Bold', Bold, () => editor.chain().focus().toggleBold().run(), 'Ctrl B')}
          {mark(s.italic, 'Italic', Italic, () => editor.chain().focus().toggleItalic().run(), 'Ctrl I')}
          {mark(s.underline, 'Underline', Underline, () => editor.chain().focus().toggleUnderline().run(), 'Ctrl U')}
          {mark(s.strike, 'Strikethrough', Strikethrough, () => editor.chain().focus().toggleStrike().run(), 'Ctrl Shift S')}
          {mark(s.code, 'Inline code', Code, () => editor.chain().focus().toggleCode().run(), 'Ctrl E')}
          <span className="doc-bar-sep" aria-hidden />
          {mark(s.link, s.link ? 'Edit link' : 'Link', Link2, () => setLinkMode(true))}
          <RcPicker
            label="Highlight"
            open={hlOpen}
            onOpenChange={setHlOpen}
            options={[...HIGHLIGHTS.map((h) => ({ ...h, icon: <span className="doc-swatch" style={{ background: h.value }} /> })), { value: '', label: 'No highlight' }]}
            value={s.highlight}
            onChange={(v) => {
              if (!v) editor.chain().focus().unsetHighlight().run();
              else editor.chain().focus().setHighlight({ color: v }).run();
            }}
            searchable={false}
            width={200}
          >
            <button
              type="button"
              className={cn('doc-bar-btn')}
              aria-pressed={!!s.highlight}
              title="Highlight"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Highlighter className="h-4 w-4" strokeWidth={s.highlight ? 2.25 : 1.75} aria-hidden />
            </button>
          </RcPicker>
        </div>
      )}
    </BubbleMenu>
  );
}
