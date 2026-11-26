/**
 * The page block's config, with no React (DOC_PAGES_PLAN §5): a page shown at a spot in its parent's text. It points at
 * the page; the tree owns the page (D2), so deleting the block never deletes or moves it. The browser's block
 * (`./View.tsx`) and the server's schema-only block are built from the same type, props and content kind
 * (backend tests/unit/docs/blockSpecs.test.ts keeps them in step).
 */
export const pageBlockConfig = {
  type: 'page' as const,
  propSchema: {
    docId: { default: '' },
  },
  content: 'none' as const,
};
