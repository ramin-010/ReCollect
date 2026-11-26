'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseNote, prettyUrl, type InlineNode, type NoteNode } from '@/lib/learning/parseNote';
import { lx } from './styles';

// Port of revise/src/components/dashboard/NoteContent.tsx. highlight.js is not installed in
// Kaaga, so code cards use Prism (already a dependency), loaded on first use.

function LinkChip({ href, label, bare }: { href: string; label: string; bare: boolean }) {
  const display = bare ? prettyUrl(label) : label;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="group/link inline-flex max-w-full items-center gap-1 align-middle rounded-md border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/[0.08] px-1.5 py-[1px] font-medium text-[hsl(var(--primary))] no-underline transition-colors hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--primary))]/15"
    >
      <span className="truncate">{display}</span>
      <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-40 transition-opacity group-hover/link:opacity-100" />
    </a>
  );
}

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.type) {
          case 'text':
            return <React.Fragment key={i}>{n.value}</React.Fragment>;
          case 'code':
            return (
              <code key={i} className="rounded bg-[hsl(var(--foreground))]/[0.08] px-1 py-[1px] font-mono text-[0.88em] text-[hsl(var(--primary))]">
                {n.value}
              </code>
            );
          case 'bold':
            return (
              <strong key={i} className={cn('font-semibold', lx.fg)}>
                <Inline nodes={n.children} />
              </strong>
            );
          case 'italic':
            return (
              <em key={i} className="italic">
                <Inline nodes={n.children} />
              </em>
            );
          case 'strike':
            return (
              <span key={i} className="line-through opacity-60">
                <Inline nodes={n.children} />
              </span>
            );
          case 'link':
            return <LinkChip key={i} href={n.href} label={n.label} bare={n.bare} />;
        }
      })}
    </>
  );
}

const PRISM_ALIASES: Record<string, string> = { js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', html: 'markup', 'c++': 'cpp' };

/** A cheap stand-in for hljs.highlightAuto. */
function guessLanguage(code: string): string {
  if (/^\s*(def |class \w+:|import \w+$|from \w+ import|print\()/m.test(code)) return 'python';
  if (/\b(public|private|static|void|System\.out|String\[\])\b/.test(code)) return 'java';
  if (/#include|std::|cout\s*<</.test(code)) return 'cpp';
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE)\b/im.test(code)) return 'sql';
  if (/:\s*(string|number|boolean)\b|interface \w+/.test(code)) return 'typescript';
  return 'javascript';
}

type PrismLike = { languages: Record<string, unknown>; highlight: (code: string, grammar: unknown, lang: string) => string };
let prismPromise: Promise<PrismLike> | null = null;
function loadPrism(): Promise<PrismLike> {
  if (!prismPromise) {
    prismPromise = import('@/lib/learning/prismLoader').then((m) => m.default as unknown as PrismLike);
  }
  return prismPromise;
}

function CodeBlock({ code, lang }: { code: string; lang: string | null }) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [detected, setDetected] = useState<string | null>(lang);

  useEffect(() => {
    let cancelled = false;
    loadPrism()
      .then((Prism) => {
        if (cancelled || !ref.current) return;
        const wanted = lang ? PRISM_ALIASES[lang.toLowerCase()] ?? lang.toLowerCase() : guessLanguage(code);
        const grammar = Prism.languages[wanted];
        if (!grammar) return;
        ref.current.innerHTML = Prism.highlight(code, grammar, wanted);
        if (!lang) setDetected(wanted);
      })
      .catch(() => {
        /* plain text stays readable */
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className={cn('lx-note-code group/code relative my-2 overflow-hidden rounded-lg border bg-[hsl(var(--foreground))]/[0.045]', lx.border)} onDoubleClick={(e) => e.stopPropagation()}>
      <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1.5">
        {detected && (
          <span className={cn('rounded bg-[hsl(var(--foreground))]/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider opacity-0 transition-opacity group-hover/code:opacity-100', lx.muted)}>
            {detected}
          </span>
        )}
        <button
          onClick={copy}
          title="Copy code"
          className={cn('rounded-md bg-[hsl(var(--foreground))]/[0.08] p-1.5 opacity-0 transition-all hover:bg-[hsl(var(--foreground))]/15 hover:text-[hsl(var(--foreground))] focus:opacity-100 group-hover/code:opacity-100', lx.muted)}
        >
          {copied ? <Check className="h-3 w-3 text-[hsl(var(--success))]" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <pre className="overflow-x-hidden px-3 py-2.5 pr-12">
        <code ref={ref} className="block whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.6] text-[hsl(var(--foreground))]/90">
          {code}
        </code>
      </pre>
    </div>
  );
}

function Block({ node, isFirst }: { node: NoteNode; isFirst: boolean }) {
  switch (node.type) {
    case 'heading':
      return (
        <h4 className={cn('text-[14.5px] font-semibold leading-snug mb-1.5', lx.fg, !isFirst && 'mt-3')}>
          <Inline nodes={node.children} />
        </h4>
      );
    case 'label':
      return (
        <p className={cn('text-[12.5px] font-semibold text-[hsl(var(--foreground))]/70 mb-1', !isFirst && 'mt-2.5')}>
          <Inline nodes={node.children} />
        </p>
      );
    case 'paragraph':
      return (
        <p className={cn('text-[13.5px] leading-relaxed text-[hsl(var(--foreground))]/85', !isFirst && 'mt-2')}>
          {node.lines.map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              <Inline nodes={line} />
            </React.Fragment>
          ))}
        </p>
      );
    case 'list':
      return (
        <ul className={cn('flex flex-col gap-1', !isFirst && 'mt-2')}>
          {node.items.map((item, i) => (
            <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-[hsl(var(--foreground))]/85">
              <span className="mt-[0.55em] h-[3px] w-[3px] shrink-0 rounded-full bg-[hsl(var(--foreground))]/40" />
              <span className="min-w-0 flex-1">
                <Inline nodes={item.children} />
              </span>
            </li>
          ))}
        </ul>
      );
    case 'code':
      return <CodeBlock code={node.code} lang={node.lang} />;
  }
}

/**
 * Renders a Quick Note's raw text as structured content (code cards, link chips, a title).
 * The source text is never rewritten: double-click still edits the exact characters typed.
 */
export function NoteContent({ content, className }: { content: string; className?: string }) {
  const nodes = useMemo(() => parseNote(content), [content]);
  if (nodes.length === 0) return null;
  return (
    <div className={cn('w-full min-w-0 break-words', className)}>
      {nodes.map((node, i) => (
        <Block key={i} node={node} isFirst={i === 0} />
      ))}
    </div>
  );
}

/** Token colours for the code cards; render once per page (QuickNotesPanel does). */
export function NoteCodeStyles() {
  return <style>{PRISM_CSS}</style>;
}

const PRISM_CSS = `
.lx-note-code .token.comment,.lx-note-code .token.prolog,.lx-note-code .token.doctype,.lx-note-code .token.cdata{color:#6c7086;font-style:italic}
.lx-note-code .token.punctuation{opacity:.75}
.lx-note-code .token.property,.lx-note-code .token.tag,.lx-note-code .token.boolean,.lx-note-code .token.number,.lx-note-code .token.constant,.lx-note-code .token.symbol{color:#e0915a}
.lx-note-code .token.selector,.lx-note-code .token.attr-name,.lx-note-code .token.string,.lx-note-code .token.char,.lx-note-code .token.builtin{color:#4fae6a}
.lx-note-code .token.operator,.lx-note-code .token.entity,.lx-note-code .token.url{color:#3aa7b9}
.lx-note-code .token.atrule,.lx-note-code .token.attr-value,.lx-note-code .token.keyword{color:#a374e0}
.lx-note-code .token.function,.lx-note-code .token.class-name{color:#4a8fe7}
.lx-note-code .token.regex,.lx-note-code .token.important,.lx-note-code .token.variable{color:#c9a227}
`;
