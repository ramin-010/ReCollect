/**
 * The Diagram block's config, with no React (DOCS_EDITOR_V2_PLAN §4.1, §11: "its own Diagram
 * block: source and drawing, full screen, checked on write"). The source is Mermaid, held as the
 * block's plain content (collaborative text, as in BlockNote's code block); Markdown prints it as a
 * ```` ```mermaid ```` fence. The server's schema-only spec and the browser's React block are both
 * built from this object.
 */
export const diagramBlockConfig = {
  type: 'diagram' as const,
  propSchema: {},
  content: 'plain' as const,
};

/** What a new diagram block starts with: nothing; the block opens on its source with a hint. */
export const DIAGRAM_HINT = 'flowchart LR\n  A[Client] --> B[Server]';
