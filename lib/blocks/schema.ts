'use client';

import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { canvasBlock } from './canvas/View';
import { calloutBlock } from './callout/View';
import { codeBlock } from './code/View';
import { diagramBlock } from './diagram/View';
import { pageBlock } from './page/View';

/** The block registry (DOCS_EDITOR_V2_PLAN §4.1): BlockNote's built-ins plus our own blocks. */
export const docSchema = BlockNoteSchema.create({
  blockSpecs: {
    // First, so its "```mermaid " input rule is tried before the code block's "```<language> ".
    diagram: diagramBlock(),
    ...defaultBlockSpecs,
    // Ours (the language picker, Copy, Shiki's colours); the key keeps the built-in's place, after the diagram.
    codeBlock: codeBlock(),
    canvas: canvasBlock(),
    callout: calloutBlock(),
    // DOC_PAGES_PLAN §5: a page shown at a spot in its parent's text.
    page: pageBlock(),
  },
});

export type DocEditor = typeof docSchema.BlockNoteEditor;
