/**
 * The canvas block's config, with no React (DOCS_EDITOR_V2_PLAN §4.1): the browser's React block
 * (`./View.tsx`) and the server's schema-only block are built from this one object, so both sides
 * agree on the type name and props. The board itself lives in the doc's Y.Doc root maps
 * (`canvas:<id>:nodes` / `:edges`), never in the block's props.
 */
export const canvasBlockConfig = {
  type: 'canvas' as const,
  propSchema: {
    canvasId: { default: '' },
    height: { default: 440 },
  },
  content: 'none' as const,
};
