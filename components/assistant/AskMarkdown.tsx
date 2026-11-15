'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The manager's answers are Markdown. A small renderer that builds React elements (never raw
 * HTML, so a note's text can't inject anything): paragraphs, headings, lists, quotes, code,
 * simple tables, bold, italics, code spans and links (web links open a new tab; app paths stay).
 */

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'h'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'list'; ordered: boolean; start: number; items: ListItem[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'hr' };

interface ListItem {
  text: string;
  children: { ordered: boolean; items: string[] } | null;
}

const LIST_ITEM = /^\s{0,3}([-*+]|\d{1,3}[.)])\s+(.*)$/;
/** A list item at any indent: [whole, indent, marker, text]. */
const NESTED_ITEM = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/;
const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

function parse(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (/^\s*```/.test(line)) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i]!)) body.push(lines[i++]!);
      i += 1;
      blocks.push({ kind: 'code', text: body.join('\n') });
      continue;
    }
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: 'h', text: heading[1]!.replace(/\s+#+\s*$/, '') });
      i += 1;
      continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ kind: 'hr' });
      i += 1;
      continue;
    }
    if (/^\s{0,3}>/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i]!)) quoted.push(lines[i++]!.replace(/^\s{0,3}>\s?/, ''));
      blocks.push({ kind: 'quote', lines: quoted });
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1]!)) {
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim()) rows.push(cells(lines[i++]!));
      blocks.push({ kind: 'table', head, rows });
      continue;
    }
    const item = line.match(NESTED_ITEM);
    if (item && item[1]!.length <= 3) {
      const base = item[1]!.length;
      const ordered = /\d/.test(item[2]!);
      const items: ListItem[] = [];
      while (i < lines.length) {
        const m = lines[i]!.match(NESTED_ITEM);
        const indent = m ? m[1]!.length : 0;
        const last = items[items.length - 1];
        if (m && indent >= base + 2 && last) {
          // A point indented under the one above: its own list inside that item (one level).
          last.children ??= { ordered: /\d/.test(m[2]!), items: [] };
          last.children.items.push(m[3]!);
          i += 1;
        } else if (m && indent <= base + 1 && /\d/.test(m[2]!) === ordered) {
          items.push({ text: m[3]!, children: null });
          i += 1;
        } else if (lines[i]!.trim() && /^\s{2,}/.test(lines[i]!) && last) {
          // An indented line carries on the item above.
          if (last.children) last.children.items[last.children.items.length - 1] += `\n${lines[i]!.trim()}`;
          else last.text += `\n${lines[i]!.trim()}`;
          i += 1;
        } else break;
      }
      blocks.push({ kind: 'list', ordered, start: ordered ? parseInt(item[2]!, 10) || 1 : 1, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !LIST_ITEM.test(lines[i]!) && !/^\s*(```|#{1,6}\s|>)/.test(lines[i]!)) para.push(lines[i++]!.trim());
    blocks.push({ kind: 'p', lines: para });
  }
  return blocks;
}

const INLINE = /(`[^`\n]+`)|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+?)\*\*|(?<![\w*])\*([^*\n\s][^*\n]*?)\*(?![\w*])/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}-${n++}`;
    if (m[1]) out.push(<code key={k}>{m[1].slice(1, -1)}</code>);
    else if (m[2] && m[3]) out.push(link(m[2], m[3], k));
    else if (m[4]) out.push(<strong key={k}>{inline(m[4], k)}</strong>);
    else if (m[5]) out.push(<em key={k}>{m[5]}</em>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function link(label: string, href: string, key: string): ReactNode {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link key={key} href={href}>
        {label}
      </Link>
    );
  }
  if (/^https?:\/\//i.test(href)) {
    return (
      <a key={key} href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }
  return <span key={key}>{label}</span>;
}

/** Lines of one block, kept as he will read them (a single line break stays a break). */
function withBreaks(lines: string[], key: string): ReactNode[] {
  return lines.flatMap((l, i) => (i === 0 ? inline(l, `${key}-${i}`) : [<br key={`${key}-br${i}`} />, ...inline(l, `${key}-${i}`)]));
}

export function AskMarkdown({ text }: { text: string }) {
  const blocks = parse(text);
  return (
    <div className="ask-md">
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.kind) {
          case 'p':
            return <p key={key}>{withBreaks(b.lines, key)}</p>;
          case 'h':
            return (
              <p key={key} className="ask-md-h">
                {inline(b.text, key)}
              </p>
            );
          case 'code':
            return (
              <pre key={key}>
                <code>{b.text}</code>
              </pre>
            );
          case 'quote':
            return <blockquote key={key}>{withBreaks(b.lines, key)}</blockquote>;
          case 'hr':
            return <hr key={key} />;
          case 'table':
            return (
              <div key={key} className="ask-md-table">
                <table>
                  <thead>
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={j}>{inline(h, `${key}-h${j}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {b.head.map((_, c) => (
                          <td key={c}>{inline(r[c] ?? '', `${key}-${j}-${c}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'list': {
            const items = b.items.map((it, j) => {
              const k = `${key}-${j}`;
              const sub = it.children?.items.map((c, n) => <li key={n}>{withBreaks(c.split('\n'), `${k}-${n}`)}</li>);
              return (
                <li key={j}>
                  {withBreaks(it.text.split('\n'), k)}
                  {it.children && (it.children.ordered ? <ol>{sub}</ol> : <ul>{sub}</ul>)}
                </li>
              );
            });
            return b.ordered ? (
              <ol key={key} start={b.start}>
                {items}
              </ol>
            ) : (
              <ul key={key}>{items}</ul>
            );
          }
        }
      })}
    </div>
  );
}
