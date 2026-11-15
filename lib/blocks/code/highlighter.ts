'use client';

import { SyntaxHighlightingExtension } from '@blocknote/core/extensions';
import { createBundledHighlighter } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';

/**
 * Shiki for the code block (BlockNote's SyntaxHighlightingExtension draws its tokens as decorations,
 * so the stored text never changes). Every grammar is its own chunk, loaded the first time a block
 * uses it; the keys are the ids in spec.ts (the block's `highlight` meta turns aliases into them, so
 * Shiki only ever sees a name it has). GitHub's tuned palettes, the old editor's colours: tokens carry
 * both as `--shiki-light` / `--shiki-dark`, and lab-editor.css picks one by the theme.
 */
const createHighlighter = createBundledHighlighter({
  langs: {
    shellscript: () => import('@shikijs/langs-precompiled/shellscript'),
    c: () => import('@shikijs/langs-precompiled/c'),
    cpp: () => import('@shikijs/langs-precompiled/cpp'),
    csharp: () => import('@shikijs/langs-precompiled/csharp'),
    css: () => import('@shikijs/langs-precompiled/css'),
    dart: () => import('@shikijs/langs-precompiled/dart'),
    diff: () => import('@shikijs/langs-precompiled/diff'),
    docker: () => import('@shikijs/langs-precompiled/docker'),
    elixir: () => import('@shikijs/langs-precompiled/elixir'),
    go: () => import('@shikijs/langs-precompiled/go'),
    graphql: () => import('@shikijs/langs-precompiled/graphql'),
    haskell: () => import('@shikijs/langs-precompiled/haskell'),
    hcl: () => import('@shikijs/langs-precompiled/hcl'),
    html: () => import('@shikijs/langs-precompiled/html'),
    http: () => import('@shikijs/langs-precompiled/http'),
    ini: () => import('@shikijs/langs-precompiled/ini'),
    java: () => import('@shikijs/langs-precompiled/java'),
    javascript: () => import('@shikijs/langs-precompiled/javascript'),
    json: () => import('@shikijs/langs-precompiled/json'),
    jsx: () => import('@shikijs/langs-precompiled/jsx'),
    kotlin: () => import('@shikijs/langs-precompiled/kotlin'),
    latex: () => import('@shikijs/langs-precompiled/latex'),
    lua: () => import('@shikijs/langs-precompiled/lua'),
    make: () => import('@shikijs/langs-precompiled/make'),
    markdown: () => import('@shikijs/langs-precompiled/markdown'),
    nginx: () => import('@shikijs/langs-precompiled/nginx'),
    php: () => import('@shikijs/langs-precompiled/php'),
    powershell: () => import('@shikijs/langs-precompiled/powershell'),
    prisma: () => import('@shikijs/langs-precompiled/prisma'),
    proto: () => import('@shikijs/langs-precompiled/proto'),
    python: () => import('@shikijs/langs-precompiled/python'),
    r: () => import('@shikijs/langs-precompiled/r'),
    regexp: () => import('@shikijs/langs-precompiled/regexp'),
    ruby: () => import('@shikijs/langs-precompiled/ruby'),
    rust: () => import('@shikijs/langs-precompiled/rust'),
    scala: () => import('@shikijs/langs-precompiled/scala'),
    scss: () => import('@shikijs/langs-precompiled/scss'),
    shellsession: () => import('@shikijs/langs-precompiled/shellsession'),
    sql: () => import('@shikijs/langs-precompiled/sql'),
    swift: () => import('@shikijs/langs-precompiled/swift'),
    terraform: () => import('@shikijs/langs-precompiled/terraform'),
    toml: () => import('@shikijs/langs-precompiled/toml'),
    tsx: () => import('@shikijs/langs-precompiled/tsx'),
    typescript: () => import('@shikijs/langs-precompiled/typescript'),
    xml: () => import('@shikijs/langs-precompiled/xml'),
    yaml: () => import('@shikijs/langs-precompiled/yaml'),
  },
  themes: {
    // Its comment grey #6e7781 is 4.1:1 on our light code surface (#f4f3f2): Primer's newer #59636e is 5.5:1.
    'github-light-default': () =>
      import('@shikijs/themes/github-light-default').then((m) => ({ default: JSON.parse(JSON.stringify(m.default).split('#6e7781').join('#59636e')) })),
    'github-dark-default': () => import('@shikijs/themes/github-dark-default'),
  },
  engine: () => createJavaScriptRegexEngine(),
});

/** One highlighter for the page (BlockNote keeps it on globalThis), made on the first code block. */
export const syntaxHighlighting = SyntaxHighlightingExtension({
  createHighlighter: () => createHighlighter({ themes: ['github-light-default', 'github-dark-default'], langs: [] }),
});
