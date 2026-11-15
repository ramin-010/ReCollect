'use client';

import { useEffect, useRef, useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { createCodeBlockSpec, plainContentToString } from '@blocknote/core';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { RcPicker } from '@/components/rc-ui/RcPicker';
import { CODE_LANGUAGES, SUPPORTED_LANGUAGES, codeBlockConfig, languageId, languageName } from './spec';

/**
 * BlockNote's own code block, for what we keep of it: pasting a <pre><code> from a page, its keys
 * (Tab indents, Enter is a new line, Enter on two empty lines at the end or Shift+Enter leaves it,
 * Delete on an empty one removes it) and "```ts " making one (the alias turned into our id).
 * Its view is replaced: BlockNote draws a native <select> that throws on a language it doesn't list.
 */
const builtIn = createCodeBlockSpec({ defaultLanguage: 'text', supportedLanguages: SUPPORTED_LANGUAGES });

const PICKER_OPTIONS = CODE_LANGUAGES.map((l) => ({ value: l.id, label: l.name, keywords: l.aliases }));

type CodeEditor = {
  isEditable: boolean;
  updateBlock: (id: string, update: { props: { language: string } }) => void;
  setTextCursorPosition: (id: string, placement?: 'start' | 'end') => void;
  focus: () => void;
};

/** The old editor's code block on BlockNote: a quiet bar (language, Copy) over the highlighted code. */
function CodeView({ blockId, language, source, editor, contentRef }: { blockId: string; language: string; source: string; editor: CodeEditor; contentRef: (node: HTMLElement | null) => void }) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const label = languageName(language);
  const choose = (id: string) => {
    editor.updateBlock(blockId, { props: { language: id } });
    requestAnimationFrame(() => {
      editor.setTextCursorPosition(blockId, 'end');
      editor.focus();
    });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  return (
    <div className="doc-code lab-code" data-language={languageId(language) ?? language}>
      <div className="doc-code-bar" contentEditable={false}>
        {editor.isEditable ? (
          <RcPicker label="Code language" options={PICKER_OPTIONS} value={languageId(language) ?? null} onChange={choose} searchPlaceholder="Search languages" width={220}>
            <button type="button" className="doc-code-lang">
              {label}
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          </RcPicker>
        ) : (
          <span className="doc-code-lang">{label}</span>
        )}
        <button type="button" className="doc-code-copy" onClick={copy} aria-live="polite">
          {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="lab-code-source" spellCheck={false}>
        <code ref={contentRef} />
      </pre>
    </div>
  );
}

/** The code block: BlockNote's config and keys, our view, Shiki's colours (highlighter.ts). */
export const codeBlock = createReactBlockSpec(
  codeBlockConfig,
  {
    meta: {
      code: true,
      defining: true,
      isolating: false,
      // Shiki gets our id for any alias ("ts", "golang"), nothing for plain text or a language we don't have.
      highlight: (block) => {
        const id = languageId(String(block.props.language ?? ''));
        return id && id !== 'text' ? id : undefined;
      },
    },
    parse: builtIn.implementation.parse as never,
    parseContent: builtIn.implementation.parseContent,
    render: ({ block, editor, contentRef }) => (
      <CodeView
        blockId={block.id}
        language={String(block.props.language ?? 'text')}
        source={plainContentToString(block.content as never)}
        editor={editor as unknown as CodeEditor}
        contentRef={contentRef}
      />
    ),
    toExternalHTML: ({ block, contentRef }) => (
      <pre>
        <code className={`language-${block.props.language}`} data-language={block.props.language} ref={contentRef} />
      </pre>
    ),
  },
  builtIn.extensions ?? [],
);
