'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inlineText, parseNote, prettyUrl, type InlineNode, type NoteNode } from '@/lib/learning/parseNote';

/**
 * A quick note or note-revision body in the slip's type: the same pure parser as the old notes
 * list (lib/learning/parseNote), drawn with rc tokens. Code blocks carry a copy button that is
 * always visible: one click puts the command on the clipboard (LOOP_V2_SPEC §8).
 */

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** What one click copies from a note: its first code block, else the whole note. */
export function primaryCopyText(content: string): string {
  const first = parseNote(content).find((n) => n.type === 'code');
  return first && first.type === 'code' ? first.code : content;
}

export function CopyButton({ text, label = 'Copy', className, size = 'sm' }: { text: string; label?: string; className?: string; size?: 'sm' | 'xs' }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <button
      type="button"
      className={cn('rc-icon-btn', size === 'xs' ? 'rc-icon-btn--sm' : '', className)}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      onClick={async (e) => {
        e.stopPropagation();
        if (await copyText(text)) {
          setCopied(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1500);
        }
      }}
    >
      {copied ? <Check className="!text-[var(--rc-good)]" /> : <Copy />}
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </button>
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
              <code key={i} className="rc-code rounded-[4px] bg-[var(--rc-surface-2)] px-1 py-[1px] text-[0.9em]">
                {n.value}
              </code>
            );
          case 'bold':
            return (
              <strong key={i} className="font-[650] text-[var(--rc-ink-1)]">
                <Inline nodes={n.children} />
              </strong>
            );
          case 'italic':
            return (
              <em key={i}>
                <Inline nodes={n.children} />
              </em>
            );
          case 'strike':
            return (
              <s key={i} className="opacity-70">
                <Inline nodes={n.children} />
              </s>
            );
          case 'link':
            return (
              <a key={i} href={n.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="break-words underline decoration-1 underline-offset-[3px] hover:decoration-2" title={n.href}>
                {n.bare ? prettyUrl(n.label) : n.label}
              </a>
            );
        }
      })}
    </>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative my-1.5 rounded-[8px] bg-[var(--rc-surface-2)]">
      <pre className="rc-code whitespace-pre-wrap break-words py-2 pl-3 pr-11 text-[var(--rc-ink-1)]">{code}</pre>
      <CopyButton text={code} label="Copy code" size="xs" className="absolute right-1 top-1" />
    </div>
  );
}

function Block({ node, first }: { node: NoteNode; first: boolean }) {
  switch (node.type) {
    case 'heading':
      return (
        <p className={cn('font-[650] text-[var(--rc-ink-1)]', !first && 'mt-2')}>
          <Inline nodes={node.children} />
        </p>
      );
    case 'label':
      return (
        <p className={cn('font-[600] text-[var(--rc-ink-2)]', !first && 'mt-1.5')}>
          <Inline nodes={node.children} />
        </p>
      );
    case 'paragraph':
      return (
        <p className={cn(!first && 'mt-1.5')}>
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
        <ul className={cn('flex flex-col gap-0.5', !first && 'mt-1.5')}>
          {node.items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-[0.62em] h-[4px] w-[4px] shrink-0 rounded-full bg-[var(--rc-ink-3)]" />
              <span className="min-w-0 flex-1">
                <Inline nodes={item.children} />
              </span>
            </li>
          ))}
        </ul>
      );
    case 'code':
      return <CodeBlock code={node.code} />;
  }
}

/** `skipFirstIf`: drop the first block when it is a title equal to this text (already shown above). */
export function NoteBody({ content, className, skipFirstIf }: { content: string; className?: string; skipFirstIf?: string }) {
  const nodes = useMemo(() => {
    const all = parseNote(content);
    const first = all[0];
    if (skipFirstIf && first && (first.type === 'heading' || first.type === 'label') && inlineText(first.children).trim() === skipFirstIf.trim()) return all.slice(1);
    return all;
  }, [content, skipFirstIf]);
  if (nodes.length === 0) return null;
  return (
    <div className={cn('min-w-0 break-words text-[15px] leading-[1.45] text-[var(--rc-ink-2)]', className)}>
      {nodes.map((n, i) => (
        <Block key={i} node={n} first={i === 0} />
      ))}
    </div>
  );
}
