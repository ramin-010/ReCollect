import { common, createLowlight } from 'lowlight';

/** One lowlight instance for every code block (highlight.js's common set, about 37 languages). */
export const lowlight = createLowlight(common);

/** The languages offered in a code block's picker. `mermaid` is plain text until diagrams render (Phase E). */
export const CODE_LANGUAGES: { value: string; label: string }[] = [
  { value: 'plaintext', label: 'Plain text' },
  { value: 'bash', label: 'Bash' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'css', label: 'CSS' },
  { value: 'diff', label: 'Diff' },
  { value: 'go', label: 'Go' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'xml', label: 'HTML / XML' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'mermaid', label: 'Mermaid' },
  { value: 'python', label: 'Python' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
  { value: 'shell', label: 'Shell session' },
  { value: 'sql', label: 'SQL' },
  { value: 'swift', label: 'Swift' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'yaml', label: 'YAML' },
];

export function languageLabel(value: string | null | undefined): string {
  if (!value) return 'Plain text';
  return CODE_LANGUAGES.find((l) => l.value === value)?.label ?? value;
}
