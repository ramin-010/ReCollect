'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { RcMenu } from '@/components/rc-ui';
import { CALLOUT_META } from '@/components/docs/editor/CalloutView';
import { CALLOUT_KINDS, calloutBlockConfig, type CalloutKind } from './spec';

/** The callout as a BlockNote block (phase 2): the kind's icon (a menu to change it) beside the text, the old editor's look. */
export const calloutBlock = createReactBlockSpec(calloutBlockConfig, {
  render: ({ block, editor, contentRef }) => {
    const kind = (CALLOUT_KINDS as readonly string[]).includes(String(block.props.kind)) ? (block.props.kind as CalloutKind) : 'note';
    const { Icon, label } = CALLOUT_META[kind];
    return (
      <div className="doc-callout lab-callout" data-callout={kind}>
        <span className="doc-callout-icon" contentEditable={false}>
          {editor.isEditable ? (
            <RcMenu
              label={`${label} callout: change kind`}
              actions={CALLOUT_KINDS.map((k) => {
                const M = CALLOUT_META[k];
                return { label: M.label, icon: <M.Icon className="h-4 w-4" />, onSelect: () => editor.updateBlock(block, { props: { kind: k } } as never) };
              })}
            >
              <button type="button" className="doc-callout-kind" aria-label={`${label} callout: change kind`} title={label}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              </button>
            </RcMenu>
          ) : (
            <span className="doc-callout-kind" role="img" aria-label={label}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </span>
          )}
        </span>
        <div className="doc-callout-body lab-callout-body" ref={contentRef} />
      </div>
    );
  },
});
