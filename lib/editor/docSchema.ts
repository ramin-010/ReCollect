import { textblockTypeInputRule, type AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImage } from '@/lib/extensions/ResizableImage';
import { EmbedNode } from '@/lib/extensions/EmbedNode';
import { MediaRow } from '@/lib/extensions/MediaRow';
import { MediaItem } from '@/lib/extensions/MediaItem';
import { InlineAINode } from '@/lib/extensions/InlineAINode';
import { Callout } from '@/lib/extensions/Callout';
import { Canvas } from '@/lib/extensions/Canvas';
import { BlockDrop } from '@/lib/extensions/BlockDrop';
import { RowHit } from '@/lib/extensions/RowHit';
import { BlockKeys } from '@/lib/extensions/BlockKeys';
import { DocGuard } from '@/lib/extensions/DocGuard';
import { lowlight } from '@/lib/editor/codeLanguages';
import { CodeBlockView } from '@/components/docs/editor/CodeBlockView';

/** Highlighted code with a language picker and Copy; same node name and `language` attr as StarterKit's. */
const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
  addInputRules() {
    // As in Notion, the third backtick makes the code block (the language comes from its picker).
    // "```ts " still works when typed fast, through the original rules.
    return [...(this.parent?.() ?? []), textblockTypeInputRule({ find: /^```$/, type: this.type })];
  },
}).configure({ lowlight, defaultLanguage: null, enableTabIndentation: true, tabSize: 2 });

export interface DocSchemaOptions {
  /** false when Yjs owns undo/redo (the live editor). */
  undoRedo?: boolean;
  /** Links open on a plain click (read-only viewers). */
  openLinksOnClick?: boolean;
}

/**
 * The nodes and marks of every doc. The live editor, the read-only viewers and the Yjs
 * converter all build from this list, so a doc parses the same everywhere. Add a block
 * here (not in one editor) or it is silently dropped wherever the schema lacks it.
 *
 * TipTap v3: StarterKit already carries Link, Underline, ListKeymap and TrailingNode.
 * Blocks beyond StarterKit: callout (`> [!TIP]` in Markdown), toggle (details/summary), highlighted code
 * (a `mermaid` block draws its diagram) and the canvas (boxes and arrows; its board lives in the
 * doc's Y.Doc, a ```canvas fence in Markdown). Side-by-side columns were removed on 2026-11-14 (the
 * server flattens stored ones before an editor loads the doc). DocGuard refuses any local change
 * that would leave the doc invalid.
 * The backend's Markdown service mirrors these names and attributes.
 */
export function docSchemaExtensions({ undoRedo = true, openLinksOnClick = false }: DocSchemaOptions = {}): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      undoRedo: undoRedo ? undefined : false,
      // Where a dragged block lands: Notion's blue line (ProseMirror's default is a 1 px black one).
      dropcursor: { color: 'var(--ui-accent-fill, #2383e2)', width: 3, class: 'doc-drop-cursor' },
      link: {
        openOnClick: openLinksOnClick,
        autolink: true,
        HTMLAttributes: { class: 'doc-link' },
      },
    }),
    ResizableImage,
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    EmbedNode,
    MediaRow,
    MediaItem,
    InlineAINode,
    CodeBlock,
    Callout,
    Details.configure({ persist: true, HTMLAttributes: { class: 'doc-toggle' } }),
    DetailsSummary,
    DetailsContent,
    Canvas,
    // A dragged block lands above or below the block under the pointer.
    BlockDrop,
    // The pointer's row picks the block (handle, clicks, drops), even left of a nested block.
    RowHit,
    BlockKeys,
    DocGuard,
  ];
}
