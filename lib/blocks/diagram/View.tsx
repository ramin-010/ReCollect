'use client';

import { useEffect, useRef, useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { createExtension, plainContentToString } from '@blocknote/core';
import { Check, Code2, Copy, Eye, Maximize2 } from 'lucide-react';
import { renderMermaid } from '@/lib/editor/mermaidRender';
import { DiagramFull } from '@/components/docs/editor/DiagramFull';
import { DIAGRAM_HINT, diagramBlockConfig } from './spec';

/** Re-renders when the theme class on <html> changes (diagrams take the theme's colours). */
function useThemeKey() {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const mo = new MutationObserver(() => setKey((k) => k + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return key;
}

type DiagramEditor = { isEditable: boolean; setTextCursorPosition: (id: string, placement?: 'start' | 'end') => void; focus: () => void };

/**
 * The drawing by default; "Edit source" shows the Mermaid above it (a double-click on the drawing
 * does too). The drawing follows the source a moment after typing stops; a broken source keeps the
 * last good drawing and says what is wrong. Full screen and Copy as in the old editor.
 */
function DiagramView({ blockId, source, editor, contentRef }: { blockId: string; source: string; editor: DiagramEditor; contentRef: (node: HTMLElement | null) => void }) {
  const empty = !source.trim();
  const [mode, setMode] = useState<'preview' | 'edit'>(() => (empty ? 'edit' : 'preview'));
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [copied, setCopied] = useState(false);
  const measureRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const themeKey = useThemeKey();
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  useEffect(() => {
    if (empty) return;
    let cancelled = false;
    const t = setTimeout(() => {
      const scope = measureRef.current;
      if (!scope) return;
      renderMermaid(source, scope)
        .then((out) => {
          if (cancelled) return;
          setSvg(out);
          setError(null);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg.split('\n').find((l) => l.trim()) ?? 'it could not be read');
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [empty, source, themeKey]);

  const edit = () => {
    if (!editor.isEditable) return;
    setMode('edit');
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
  const showSource = mode === 'edit' || empty;

  return (
    <div className="doc-code lab-diagram" data-language="mermaid" data-mode={showSource ? 'edit' : 'preview'}>
      <div className="doc-code-bar" contentEditable={false}>
        <span className="doc-code-lang">Diagram · Mermaid</span>
        <span className="flex items-center gap-1">
          {svg && !empty && (
            <button type="button" className="doc-code-copy" onClick={() => setFull(true)}>
              <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Full screen
            </button>
          )}
          {editor.isEditable && !empty && (
            <button type="button" className="doc-code-copy doc-code-mode" onClick={() => (showSource ? setMode('preview') : edit())} aria-pressed={showSource}>
              {showSource ? <Eye className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> : <Code2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
              {showSource ? 'Hide source' : 'Edit source'}
            </button>
          )}
          <button type="button" className="doc-code-copy" onClick={copy} aria-live="polite">
            {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>
      <pre className="lab-diagram-source" spellCheck={false} hidden={!showSource || undefined}>
        <code ref={contentRef} className="language-mermaid" />
      </pre>
      <div className="doc-diagram" contentEditable={false}>
        {/* Mermaid draws and measures in here; React never renders children into it. */}
        <div ref={measureRef} className="doc-diagram-measure" aria-hidden />
        {svg && !empty ? (
          <div
            className="doc-diagram-svg"
            role="img"
            aria-label="Diagram"
            onDoubleClick={edit}
            // Mermaid's strict security level sanitises the SVG (no scripts, no HTML labels).
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : !error || empty ? (
          <p className="doc-diagram-note">{empty ? `Write Mermaid above, for example: ${DIAGRAM_HINT.replace(/\n\s*/g, '; ')}` : 'Drawing the diagram…'}</p>
        ) : null}
        {error && !empty && <p className="doc-diagram-note doc-diagram-error">The diagram has an error: {error}</p>}
      </div>
      {full && svg && <DiagramFull svg={svg} name="diagram" onClose={() => setFull(false)} />}
    </div>
  );
}

/** Keys inside a diagram's source, as in a code block: Enter is a new line, Tab two spaces, Shift+Enter leaves it. "```mermaid " makes one. */
const diagramKeys = createExtension({
  key: 'diagram-keys',
  inputRules: [{ find: /^```mermaid\s$/, replace: () => ({ type: 'diagram', props: {}, content: [] }) }],
  keyboardShortcuts: {
    Enter: ({ editor }) => {
      const ed = editor as unknown as { getTextCursorPosition: () => { block: { type: string } }; transact: <T>(fn: (tr: { insertText: (t: string) => void }) => T) => T };
      if (ed.getTextCursorPosition().block.type !== 'diagram') return false;
      return ed.transact((tr) => {
        tr.insertText('\n');
        return true;
      });
    },
    Tab: ({ editor }) => {
      const ed = editor as unknown as { getTextCursorPosition: () => { block: { type: string } }; transact: <T>(fn: (tr: { insertText: (t: string) => void }) => T) => T };
      if (ed.getTextCursorPosition().block.type !== 'diagram') return false;
      return ed.transact((tr) => {
        tr.insertText('  ');
        return true;
      });
    },
    'Shift-Enter': ({ editor }) => {
      const ed = editor as unknown as {
        getTextCursorPosition: () => { block: { type: string; id: string } };
        insertBlocks: (b: unknown[], ref: string, p: 'after') => { id: string }[];
        setTextCursorPosition: (id: string, p: 'start') => void;
      };
      const { block } = ed.getTextCursorPosition();
      if (block.type !== 'diagram') return false;
      const [made] = ed.insertBlocks([{ type: 'paragraph' }], block.id, 'after');
      if (made) ed.setTextCursorPosition(made.id, 'start');
      return true;
    },
  },
});

/** The Diagram block: Mermaid source as the block's text, its drawing under it. */
export const diagramBlock = createReactBlockSpec(
  diagramBlockConfig,
  {
    meta: { code: true, defining: true, isolating: false },
    render: ({ block, editor, contentRef }) => (
      <DiagramView blockId={block.id} source={plainContentToString(block.content as never)} editor={editor as unknown as DiagramEditor} contentRef={contentRef} />
    ),
    toExternalHTML: ({ contentRef }) => (
      <pre>
        <code className="language-mermaid" ref={contentRef} />
      </pre>
    ),
  },
  [diagramKeys],
);
