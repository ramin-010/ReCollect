/**
 * The callout block's config, with no React (DOCS_EDITOR_V2_PLAN §4.1, §11: "redesign as a custom
 * block; same Markdown": `> [!TIP]` and its four siblings). The server's schema-only spec and the
 * browser's React block are both built from this object.
 */
export const CALLOUT_KINDS = ['note', 'tip', 'important', 'warning', 'caution'] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

export const calloutBlockConfig = {
  type: 'callout' as const,
  propSchema: {
    kind: { default: 'note' as CalloutKind, values: CALLOUT_KINDS },
  },
  content: 'inline' as const,
};
