import type { JSONContent } from '@tiptap/core';

/**
 * Doc templates: the structure is what makes recall work later (PLAN §2). Sections are
 * headings with empty lines to fill; "Recall check" toggles hide the answer so the doc
 * doubles as a self-test. No instruction text is left behind in the doc.
 */

const text = (t: string): JSONContent => ({ type: 'text', text: t });
const p = (t?: string): JSONContent => ({ type: 'paragraph', ...(t ? { content: [text(t)] } : {}) });
const h2 = (t: string): JSONContent => ({ type: 'heading', attrs: { level: 2 }, content: [text(t)] });
const bullets = (items: string[]): JSONContent => ({
  type: 'bulletList',
  content: items.map((i) => ({ type: 'listItem', content: [p(i || undefined)] })),
});
const code = (language: string | null, body = ''): JSONContent => ({
  type: 'codeBlock',
  attrs: { language },
  ...(body ? { content: [text(body)] } : {}),
});
const toggle = (summary: string): JSONContent => ({
  type: 'details',
  attrs: { open: false },
  content: [
    { type: 'detailsSummary', content: [text(summary)] },
    { type: 'detailsContent', content: [p()] },
  ],
});

export interface DocTemplate {
  id: 'blank' | 'dsa' | 'concept' | 'system' | 'notes';
  name: string;
  /** One line in the picker. */
  description: string;
  /** Section names, shown as the preview. */
  outline: string[];
  /** A title to start from (selected so typing replaces it); empty = "Untitled". */
  title: string;
  content: JSONContent[];
}

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'An empty page.',
    outline: [],
    title: '',
    content: [p()],
  },
  {
    id: 'dsa',
    name: 'DSA problem',
    description: 'One problem: the idea, the code and what tripped you up.',
    outline: ['Problem', 'Approach', 'Complexity', 'Code', 'My mistakes', 'Recall check', 'Similar problems'],
    title: '',
    content: [
      h2('Problem'),
      p(),
      h2('Approach'),
      p(),
      h2('Complexity'),
      bullets(['Time: ', 'Space: ']),
      h2('Code'),
      code(null),
      h2('My mistakes'),
      bullets(['']),
      h2('Recall check'),
      toggle('What is the key idea?'),
      toggle('Which pattern is this, and how would you spot it again?'),
      h2('Similar problems'),
      bullets(['']),
    ],
  },
  {
    id: 'concept',
    name: 'Concept',
    description: 'Understand one idea well enough to explain it.',
    outline: ['What it is', 'Why it matters', 'How it works', 'Example', 'Pitfalls', 'Recall check'],
    title: '',
    content: [
      h2('What it is'),
      p(),
      h2('Why it matters'),
      p(),
      h2('How it works'),
      p(),
      h2('Example'),
      code(null),
      h2('Pitfalls'),
      bullets(['']),
      h2('Recall check'),
      toggle('Explain it in two sentences.'),
      toggle('When would you not use it?'),
    ],
  },
  {
    id: 'system',
    name: 'System design',
    description: 'Requirements to trade-offs, with a diagram.',
    outline: ['Requirements', 'Estimates', 'API', 'Data model', 'Design', 'Deep dives', 'Trade-offs', 'Recall check'],
    title: '',
    content: [
      h2('Requirements'),
      bullets(['Functional: ', 'Non-functional: ']),
      h2('Estimates'),
      bullets(['Users and traffic: ', 'Storage: ']),
      h2('API'),
      code(null),
      h2('Data model'),
      p(),
      h2('Design'),
      code('mermaid', 'flowchart LR\n  client[Client] --> api[API]\n  api --> db[(Database)]'),
      h2('Deep dives'),
      p(),
      h2('Trade-offs'),
      bullets(['']),
      h2('Recall check'),
      toggle('What breaks first at 10x the load?'),
      toggle('Which trade-off did you make, and why?'),
    ],
  },
  {
    id: 'notes',
    name: 'Notes',
    description: 'A book, course or talk: the source and what stuck.',
    outline: ['Source', 'Key ideas', 'Quotes', 'My takeaways', 'Questions'],
    title: '',
    content: [
      h2('Source'),
      p(),
      h2('Key ideas'),
      bullets(['']),
      h2('Quotes'),
      { type: 'blockquote', content: [p()] },
      h2('My takeaways'),
      p(),
      h2('Questions'),
      bullets(['']),
    ],
  },
];

export const templateById = (id: string | null | undefined) => DOC_TEMPLATES.find((t) => t.id === id) ?? null;
