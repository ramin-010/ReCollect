'use client';

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Info, Lightbulb, MessageSquareWarning, OctagonAlert, TriangleAlert } from 'lucide-react';
import { RcMenu } from '@/components/rc-ui';
import { CALLOUT_KINDS, type CalloutKind } from '@/lib/extensions/Callout';

export const CALLOUT_META: Record<CalloutKind, { label: string; Icon: typeof Info }> = {
  note: { label: 'Note', Icon: Info },
  tip: { label: 'Tip', Icon: Lightbulb },
  important: { label: 'Important', Icon: MessageSquareWarning },
  warning: { label: 'Warning', Icon: TriangleAlert },
  caution: { label: 'Caution', Icon: OctagonAlert },
};

/** A callout block: the kind's icon (a menu to change the kind) beside editable content. */
export function CalloutView({ node, updateAttributes, editor }: NodeViewProps) {
  const kind = (CALLOUT_KINDS as readonly string[]).includes(node.attrs.kind) ? (node.attrs.kind as CalloutKind) : 'note';
  const { Icon, label } = CALLOUT_META[kind];
  const icon = <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />;

  return (
    <NodeViewWrapper className="doc-callout" data-callout={kind}>
      <span className="doc-callout-icon" contentEditable={false}>
        {editor.isEditable ? (
          <RcMenu
            label={`${label} callout: change kind`}
            align="start"
            actions={CALLOUT_KINDS.map((k) => {
              const M = CALLOUT_META[k];
              return {
                label: M.label,
                icon: <M.Icon className="h-4 w-4" strokeWidth={1.75} />,
                onSelect: () => updateAttributes({ kind: k }),
              };
            })}
          >
            <button type="button" className="doc-callout-kind" aria-label={`${label} callout: change kind`} title={label}>
              {icon}
            </button>
          </RcMenu>
        ) : (
          <span className="doc-callout-kind" role="img" aria-label={label}>
            {icon}
          </span>
        )}
      </span>
      <NodeViewContent className="doc-callout-body" />
    </NodeViewWrapper>
  );
}
