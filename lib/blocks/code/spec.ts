/**
 * The code block's config, with no React. It is BlockNote's own codeBlock (the same type, the one
 * `language` prop with its "text" default, plain content), which the server uses unchanged
 * (backend tests/unit/docs/blockSpecs.test.ts keeps the two in step); only the browser's view is
 * ours: a quiet bar with the language picker and Copy, and Shiki's GitHub colours.
 */
export const codeBlockConfig = {
  type: 'codeBlock' as const,
  propSchema: {
    language: { default: 'text' },
  },
  content: 'plain' as const,
};

export interface CodeLanguage {
  /** What the block stores, and Shiki's grammar name. */
  id: string;
  name: string;
  /** Other names that mean it: the grammar's own aliases and what people type after ```. */
  aliases: string[];
}

/**
 * The picker's languages (the old editor's list and what a backend and system-design learner
 * writes: Go, Dockerfile, Nginx, Protobuf, Terraform, Prisma…). Each id is a grammar in
 * `@shikijs/langs-precompiled`, loaded the first time a block uses it (highlighter.ts).
 */
export const CODE_LANGUAGES: CodeLanguage[] = [
  { id: 'text', name: 'Plain text', aliases: ['txt', 'plain', 'plaintext', 'none'] },
  { id: 'shellscript', name: 'Bash', aliases: ['bash', 'sh', 'shell', 'zsh'] },
  { id: 'c', name: 'C', aliases: [] },
  { id: 'cpp', name: 'C++', aliases: ['c++'] },
  { id: 'csharp', name: 'C#', aliases: ['c#', 'cs'] },
  { id: 'css', name: 'CSS', aliases: [] },
  { id: 'dart', name: 'Dart', aliases: [] },
  { id: 'diff', name: 'Diff', aliases: ['patch'] },
  { id: 'docker', name: 'Dockerfile', aliases: ['dockerfile'] },
  { id: 'elixir', name: 'Elixir', aliases: ['ex', 'exs'] },
  { id: 'go', name: 'Go', aliases: ['golang'] },
  { id: 'graphql', name: 'GraphQL', aliases: ['gql'] },
  { id: 'haskell', name: 'Haskell', aliases: ['hs'] },
  { id: 'hcl', name: 'HCL', aliases: [] },
  { id: 'html', name: 'HTML', aliases: ['htm'] },
  { id: 'http', name: 'HTTP', aliases: [] },
  { id: 'ini', name: 'INI', aliases: ['properties', 'cfg', 'conf'] },
  { id: 'java', name: 'Java', aliases: [] },
  { id: 'javascript', name: 'JavaScript', aliases: ['js', 'cjs', 'mjs', 'node'] },
  { id: 'json', name: 'JSON', aliases: [] },
  { id: 'jsx', name: 'JSX', aliases: [] },
  { id: 'kotlin', name: 'Kotlin', aliases: ['kt', 'kts'] },
  { id: 'latex', name: 'LaTeX', aliases: ['tex'] },
  { id: 'lua', name: 'Lua', aliases: [] },
  { id: 'make', name: 'Makefile', aliases: ['makefile'] },
  { id: 'markdown', name: 'Markdown', aliases: ['md'] },
  { id: 'nginx', name: 'Nginx', aliases: [] },
  { id: 'php', name: 'PHP', aliases: [] },
  { id: 'powershell', name: 'PowerShell', aliases: ['ps', 'ps1', 'pwsh'] },
  { id: 'prisma', name: 'Prisma', aliases: [] },
  { id: 'proto', name: 'Protobuf', aliases: ['protobuf'] },
  { id: 'python', name: 'Python', aliases: ['py', 'python3'] },
  { id: 'r', name: 'R', aliases: [] },
  { id: 'regexp', name: 'Regex', aliases: ['regex'] },
  { id: 'ruby', name: 'Ruby', aliases: ['rb'] },
  { id: 'rust', name: 'Rust', aliases: ['rs'] },
  { id: 'scala', name: 'Scala', aliases: [] },
  { id: 'scss', name: 'SCSS', aliases: [] },
  { id: 'shellsession', name: 'Terminal session', aliases: ['console', 'terminal'] },
  { id: 'sql', name: 'SQL', aliases: ['postgres', 'postgresql', 'mysql', 'sqlite'] },
  { id: 'swift', name: 'Swift', aliases: [] },
  { id: 'terraform', name: 'Terraform', aliases: ['tf', 'tfvars'] },
  { id: 'toml', name: 'TOML', aliases: [] },
  { id: 'tsx', name: 'TSX', aliases: [] },
  { id: 'typescript', name: 'TypeScript', aliases: ['ts', 'cts', 'mts'] },
  { id: 'xml', name: 'XML', aliases: ['svg'] },
  { id: 'yaml', name: 'YAML', aliases: ['yml'] },
];

const BY_NAME = new Map<string, CodeLanguage>();
for (const lang of CODE_LANGUAGES) for (const key of [lang.id, ...lang.aliases]) BY_NAME.set(key, lang);

/** The language a stored or typed name means ("ts" → typescript), or undefined for one we don't have. */
export function languageId(value: string | null | undefined): string | undefined {
  if (!value) return 'text';
  return BY_NAME.get(value.trim().toLowerCase())?.id;
}

/** The picker's words for a block's language; a name we don't know shows as it was written. */
export function languageName(value: string | null | undefined): string {
  const id = languageId(value);
  return id ? BY_NAME.get(id)!.name : String(value);
}

/** BlockNote's `supportedLanguages` shape, for the "```ts " shortcut that makes a code block. */
export const SUPPORTED_LANGUAGES: Record<string, { name: string; aliases: string[] }> = Object.fromEntries(
  CODE_LANGUAGES.map((l) => [l.id, { name: l.name, aliases: l.aliases }]),
);
