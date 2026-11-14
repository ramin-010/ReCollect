'use client';

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Check, ChevronDown, Code2, Copy, Eye, Maximize2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { RcPicker } from '@/components/rc-ui/RcPicker';
import { CODE_LANGUAGES, languageLabel } from '@/lib/editor/codeLanguages';
import { renderMermaid } from '@/lib/editor/mermaidRender';
import { DiagramFull } from './DiagramFull';

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

/**
 * A code block: a quiet bar (language picker, Copy) over highlighted, editable code.
 * A `mermaid` block draws its diagram: the preview by default, the source above it on "Edit source".
 */
export function CodeBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const lang: string = node.attrs.language || 'plaintext';
  const isMermaid = lang === 'mermaid';
  const source = node.textContent;
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'preview' | 'edit'>(() => (source.trim() ? 'preview' : 'edit'));
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const themeKey = useThemeKey();
  useEffect(() => () => clearTimeout(timer.current), []);

  const empty = !source.trim();
  useEffect(() => {
    if (!isMermaid || empty) return;
    let cancelled = false;
    const t = setTimeout(() => {
      const scope = diagramRef.current;
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
  }, [isMermaid, empty, source, themeKey]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  const label = isMermaid ? 'Diagram · Mermaid' : languageLabel(lang);
  const codeHidden = isMermaid && mode === 'preview';

  return (
    <NodeViewWrapper ref={wrapRef} className="doc-code" data-language={lang} data-mode={isMermaid ? mode : undefined}>
      <div className="doc-code-bar" contentEditable={false}>
        {editor.isEditable ? (
          <RcPicker
            label="Code language"
            options={CODE_LANGUAGES}
            value={lang}
            onChange={(val) => updateAttributes({ language: val === 'plaintext' ? null : val })}
            searchPlaceholder="Search languages"
            width={220}
          >
            <button type="button" className="doc-code-lang">
              {label}
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          </RcPicker>
        ) : (
          <span className="doc-code-lang">{label}</span>
        )}
        <span className="flex items-center gap-1">
          {isMermaid && svg && !empty && (
            <button type="button" className="doc-code-copy" onClick={() => setFull(true)}>
              <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Full screen
            </button>
          )}
          {isMermaid && editor.isEditable && (
            <button
              type="button"
              className="doc-code-copy doc-code-mode"
              onClick={() => setMode(mode === 'preview' ? 'edit' : 'preview')}
              aria-pressed={mode === 'edit'}
            >
              {mode === 'preview' ? <Code2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
              {mode === 'preview' ? 'Edit source' : 'Hide source'}
            </button>
          )}
          <button type="button" className="doc-code-copy" onClick={copy} aria-live="polite">
            {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>
      <pre spellCheck={false} hidden={codeHidden || undefined}>
        <NodeViewContent<'code'> as="code" className={`hljs language-${lang}`} />
      </pre>
      {isMermaid && (
        <div className="doc-diagram" contentEditable={false}>
          {/* Mermaid draws and measures in here; React never renders children into it. */}
          <div ref={diagramRef} className="doc-diagram-measure" aria-hidden />
          {svg && !empty ? (
            <div
              className="doc-diagram-svg"
              role="img"
              aria-label="Diagram"
              onDoubleClick={() => editor.isEditable && setMode('edit')}
              // Mermaid's strict security level sanitises the SVG (no scripts, no HTML labels).
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : !error || empty ? (
            <p className="doc-diagram-note">{empty ? 'Write Mermaid source above, for example: flowchart LR; A --> B' : 'Drawing the diagram…'}</p>
          ) : null}
          {error && !empty && <p className="doc-diagram-note doc-diagram-error">The diagram has an error: {error}</p>}
        </div>
      )}
      {full && svg && <DiagramFull svg={svg} name="diagram" onClose={() => setFull(false)} />}
    </NodeViewWrapper>
  );
}
