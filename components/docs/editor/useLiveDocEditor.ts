'use client';

import { useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import AutoJoiner from 'tiptap-extension-auto-joiner';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type * as Y from 'yjs';
import type { EditorView } from '@tiptap/pm/view';
import { Fragment, Slice } from '@tiptap/pm/model';
import { agentApi } from '@/lib/api/agentApi';
import { toast } from 'sonner';
import { docSchemaExtensions } from '@/lib/editor/docSchema';
import { isEmbeddableUrl, getEmbedType } from '@/lib/utils/embedUtils';
import { uploadToCloud } from '@/lib/utils/upload';
import { SlashMenu } from './SlashMenu';

const imageId = () => `img_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

/** Plain text that reads as Markdown: headings, lists, quotes, fences, bold, code or links on more than one line. */
export function looksLikeMarkdown(text: string): boolean {
  if (!text.includes('\n')) return false;
  return [/^#{1,6}\s/m, /^\s*[-*+]\s+\S/m, /^\s*\d+[.)]\s+\S/m, /^```/m, /^>\s/m, /\*\*[^*\n]+\*\*/, /`[^`\n]+`/, /\[[^\]\n]+\]\([^)\s]+\)/].some((re) =>
    re.test(text),
  );
}

/**
 * Pastes Markdown as blocks, converted by the server (the same dialect agents write). Falls back
 * to plain text when the conversion fails.
 */
async function pasteMarkdown(view: EditorView, text: string) {
  try {
    const blocks = await agentApi.markdownToBlocks(text);
    if (!blocks.length || view.isDestroyed) return;
    const nodes = blocks.map((b) => view.state.schema.nodeFromJSON(b));
    view.dispatch(view.state.tr.replaceSelection(new Slice(Fragment.fromArray(nodes), 0, 0)).scrollIntoView());
  } catch {
    if (!view.isDestroyed) view.dispatch(view.state.tr.insertText(text).scrollIntoView());
  }
}

/** Uploads image files and inserts them at `pos` (or the selection), one toast per batch. */
export function insertImages(view: EditorView, files: File[], docId: string, pos?: number) {
  const images = files.filter((f) => f.type.startsWith('image/'));
  if (!images.length) return false;
  const run = async () => {
    for (const file of images) {
      const result = await uploadToCloud(file, docId, imageId());
      if (!result?.url) throw new Error('upload failed');
      const type = view.state.schema.nodes.resizableImage ?? view.state.schema.nodes.image;
      if (!type) return;
      const node = type.create({ src: result.url, imageId: result.imageId });
      const at = pos ?? view.state.selection.from;
      const $at = view.state.doc.resolve(Math.min(at, view.state.doc.content.size));
      const parent = $at.parent;
      let tr = view.state.tr;
      if (parent.type.name === 'paragraph' && parent.content.size === 0 && $at.depth > 0) {
        tr = tr.replaceWith($at.before(), $at.after(), node);
      } else {
        tr = tr.insert(at, node);
      }
      view.dispatch(tr);
    }
  };
  toast.promise(run(), {
    loading: images.length > 1 ? `Uploading ${images.length} images…` : 'Uploading the image…',
    success: images.length > 1 ? 'Images added' : 'Image added',
    error: 'The upload failed. Check your connection and try again.',
  });
  return true;
}

/**
 * The one doc editor: every doc is live (Yjs over Hocuspocus), solo or shared, so an agent's
 * write or a second tab shows up as you watch and nothing overwrites your typing.
 */
export function useLiveDocEditor({
  ydoc,
  provider,
  user,
  docId,
  editable,
}: {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  user: { name: string; color: string };
  docId: string;
  editable: boolean;
}) {
  return useEditor(
    {
      editable,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions: [
        ...docSchemaExtensions({ undoRedo: false }),
        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === 'heading') return `Heading ${node.attrs.level}`;
            if (node.type.name === 'detailsSummary') return 'Toggle';
            return "Write, or press '/' for blocks";
          },
          showOnlyWhenEditable: true,
          showOnlyCurrent: true,
          includeChildren: true,
        }),
        AutoJoiner.configure({ elementsToJoin: ['bulletList', 'orderedList'] }),
        ...(editable ? [SlashMenu] : []),
        Collaboration.configure({ document: ydoc }),
        ...(provider ? [CollaborationCaret.configure({ provider, user })] : []),
      ],
      editorProps: {
        attributes: {
          class: 'doc-prose',
          'aria-label': 'Document body',
        },
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData('text/plain')?.trim();
          if (text && isEmbeddableUrl(text) && view.state.selection.empty) {
            const node = view.state.schema.nodes.embed?.create({ url: text, embedType: getEmbedType(text) });
            if (node) {
              event.preventDefault();
              view.dispatch(view.state.tr.replaceSelectionWith(node));
              return true;
            }
          }
          const files = Array.from(event.clipboardData?.files ?? []);
          if (files.some((f) => f.type.startsWith('image/'))) {
            event.preventDefault();
            return insertImages(view, files, docId);
          }
          // Markdown copied as plain text (a terminal, a .md file, an AI chat's raw view) becomes blocks.
          const html = event.clipboardData?.getData('text/html');
          const plain = event.clipboardData?.getData('text/plain') ?? '';
          const inCode = view.state.selection.$from.parent.type.spec.code;
          if (!html && !inCode && looksLikeMarkdown(plain)) {
            event.preventDefault();
            void pasteMarkdown(view, plain);
            return true;
          }
          return false;
        },
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false;
          const files = Array.from(event.dataTransfer?.files ?? []);
          if (!files.some((f) => f.type.startsWith('image/'))) return false;
          event.preventDefault();
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          return insertImages(view, files, docId, pos);
        },
      },
    },
    [ydoc, provider, editable],
  );
}
