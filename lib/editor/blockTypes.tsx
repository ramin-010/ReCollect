import type { Editor, Range } from '@tiptap/core';
import type { ChainedCommands } from '@tiptap/core';
import {
  ChevronRight,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Info,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Shapes,
  Quote,
  Type,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

/** Fired on window when a block asks the page to pick an image (the page owns the upload dialog). */
export const DOC_IMAGE_EVENT = 'doc:insert-image';

export interface BlockType {
  id: string;
  label: string;
  /** The Markdown shortcut that makes this block as you type, shown as a hint. */
  hint?: string;
  icon: LucideIcon;
  group: 'Basic blocks' | 'Media' | 'Advanced';
  aliases: string[];
  /** Turns the block at the selection into this type. */
  apply: (chain: ChainedCommands) => ChainedCommands;
  /** In the "Turn into" menus (blocks that hold text). */
  turnInto?: boolean;
  isActive?: (editor: Editor) => boolean;
}

export const BLOCK_TYPES: BlockType[] = [
  { id: 'text', label: 'Text', icon: Type, group: 'Basic blocks', aliases: ['paragraph', 'plain', 'p'], turnInto: true,
    apply: (c) => c.clearNodes().setParagraph(),
    isActive: (e) => e.isActive('paragraph') && !e.isActive('bulletList') && !e.isActive('orderedList') && !e.isActive('taskList') && !e.isActive('blockquote') && !e.isActive('callout') },
  { id: 'h1', label: 'Heading 1', hint: '#', icon: Heading1, group: 'Basic blocks', aliases: ['h1', 'title', 'big'], turnInto: true,
    apply: (c) => c.clearNodes().setHeading({ level: 1 }), isActive: (e) => e.isActive('heading', { level: 1 }) },
  { id: 'h2', label: 'Heading 2', hint: '##', icon: Heading2, group: 'Basic blocks', aliases: ['h2', 'subtitle'], turnInto: true,
    apply: (c) => c.clearNodes().setHeading({ level: 2 }), isActive: (e) => e.isActive('heading', { level: 2 }) },
  { id: 'h3', label: 'Heading 3', hint: '###', icon: Heading3, group: 'Basic blocks', aliases: ['h3', 'small'], turnInto: true,
    apply: (c) => c.clearNodes().setHeading({ level: 3 }), isActive: (e) => e.isActive('heading', { level: 3 }) },
  { id: 'bullet', label: 'Bulleted list', hint: '-', icon: List, group: 'Basic blocks', aliases: ['ul', 'bullets', 'unordered'], turnInto: true,
    apply: (c) => c.clearNodes().toggleBulletList(), isActive: (e) => e.isActive('bulletList') },
  { id: 'numbered', label: 'Numbered list', hint: '1.', icon: ListOrdered, group: 'Basic blocks', aliases: ['ol', 'ordered', 'numbers'], turnInto: true,
    apply: (c) => c.clearNodes().toggleOrderedList(), isActive: (e) => e.isActive('orderedList') },
  { id: 'todo', label: 'To-do list', hint: '[]', icon: ListChecks, group: 'Basic blocks', aliases: ['task', 'checkbox', 'check', 'todo'], turnInto: true,
    apply: (c) => c.clearNodes().toggleTaskList(), isActive: (e) => e.isActive('taskList') },
  { id: 'toggle', label: 'Toggle', icon: ChevronRight, group: 'Basic blocks', aliases: ['details', 'collapse', 'fold', 'hide', 'answer'], turnInto: true,
    apply: (c) => c.setDetails(), isActive: (e) => e.isActive('details') },
  { id: 'quote', label: 'Quote', hint: '>', icon: Quote, group: 'Basic blocks', aliases: ['blockquote', 'citation'], turnInto: true,
    apply: (c) => c.clearNodes().setBlockquote(), isActive: (e) => e.isActive('blockquote') },
  { id: 'callout', label: 'Callout', icon: Info, group: 'Basic blocks', aliases: ['note', 'tip', 'warning', 'info', 'box', 'alert'], turnInto: true,
    apply: (c) => c.setCallout({ kind: 'note' }), isActive: (e) => e.isActive('callout') },
  { id: 'code', label: 'Code', hint: '```', icon: Code2, group: 'Basic blocks', aliases: ['snippet', 'pre', 'program'], turnInto: true,
    apply: (c) => c.clearNodes().setCodeBlock(), isActive: (e) => e.isActive('codeBlock') },
  { id: 'divider', label: 'Divider', hint: '---', icon: Minus, group: 'Basic blocks', aliases: ['hr', 'line', 'separator', 'rule'],
    apply: (c) => c.setHorizontalRule() },
  { id: 'image', label: 'Image', icon: ImagePlus, group: 'Media', aliases: ['picture', 'photo', 'screenshot', 'upload'],
    apply: (c) => {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(DOC_IMAGE_EVENT));
      return c;
    } },
  { id: 'canvas', label: 'Canvas', icon: Shapes, group: 'Advanced', aliases: ['canvas', 'whiteboard', 'board', 'boxes', 'draw', 'sketch', 'system', 'design', 'arrows'],
    apply: (c) => c.insertCanvas() },
  { id: 'mermaid', label: 'Diagram (Mermaid)', icon: Workflow, group: 'Advanced', aliases: ['mermaid', 'diagram', 'flowchart', 'chart', 'graph', 'sequence'],
    apply: (c) => c.clearNodes().setCodeBlock({ language: 'mermaid' }) },
  // "Ask AI to write" (the old inlineAi node on the Groq/Gemini chain) is hidden (SYNC_SPINE_SPEC 0.3):
  // stored inlineAi nodes still load; the node, its view and its route go in the editor rebuild,
  // where the new Ask AI runs on the same tools as agents.
];

/** Blocks shown in "Turn into" menus. */
export const TURN_INTO_TYPES = BLOCK_TYPES.filter((b) => b.turnInto);

/** Slash-menu search: label words, then aliases. */
export function filterBlockTypes(query: string): BlockType[] {
  const q = query.trim().toLowerCase();
  if (!q) return BLOCK_TYPES;
  const squash = (s: string) => s.toLowerCase().replace(/[\s()-]+/g, '');
  const sq = squash(q);
  const starts = (s: string) => s.toLowerCase().split(/[\s()-]+/).some((w) => w.startsWith(q));
  return BLOCK_TYPES.filter((b) => squash(b.label).startsWith(sq) || starts(b.label) || b.aliases.some((a) => a.startsWith(q)));
}

/** Runs a block type from the slash menu: removes the typed "/query", then applies the type. */
export function runSlashItem(editor: Editor, range: Range, item: BlockType) {
  item.apply(editor.chain().focus().deleteRange(range)).run();
}

/** The current block's type, for the format bar's "Turn into" button. */
export function activeBlockType(editor: Editor): BlockType {
  return TURN_INTO_TYPES.slice(1).find((b) => b.isActive?.(editor)) ?? BLOCK_TYPES[0]!;
}
