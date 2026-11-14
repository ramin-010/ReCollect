'use client';

type Mermaid = (typeof import('mermaid'))['default'];

let loading: Promise<Mermaid> | null = null;
let themedFor: string | null = null;
let seq = 0;

const v = (el: Element, name: string, fallback: string) => getComputedStyle(el).getPropertyValue(name).trim() || fallback;

/**
 * Renders Mermaid source to SVG with the doc's own tokens (light or dark), loading Mermaid only
 * when a diagram first appears. `scope` is the element the diagram shows in: Mermaid measures its
 * labels there, so the text is measured with the same inherited styles it is drawn with (no clipping).
 * Throws the parse error when the source is invalid.
 */
export async function renderMermaid(code: string, scope: Element): Promise<string> {
  const mermaid = await (loading ??= import('mermaid').then((m) => m.default));
  const dark = !document.documentElement.classList.contains('light');
  const key = `${dark ? 'dark' : 'light'}|${v(scope, '--rc-ink-1', '')}`;
  if (themedFor !== key) {
    const ink1 = v(scope, '--rc-ink-1', dark ? '#f0efed' : '#2c2c2b');
    const ink2 = v(scope, '--rc-ink-2', dark ? '#ada9a3' : '#5f5e59');
    const ink3 = v(scope, '--rc-ink-3', dark ? '#8e8b86' : '#73706b');
    const surface = v(scope, '--rc-surface', dark ? '#202020' : '#ffffff');
    const surface2 = v(scope, '--rc-surface-2', dark ? '#262626' : '#f4f3f2');
    const line = v(scope, '--rc-line-strong', dark ? '#383836' : '#e3e2df');
    const font = v(scope, '--rc-font', 'ui-sans-serif, system-ui, sans-serif');
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: font,
      themeVariables: {
        darkMode: dark,
        background: surface,
        fontFamily: font,
        fontSize: '14px',
        primaryColor: surface2,
        primaryTextColor: ink1,
        primaryBorderColor: ink3,
        secondaryColor: surface,
        secondaryTextColor: ink1,
        secondaryBorderColor: line,
        tertiaryColor: surface,
        tertiaryTextColor: ink1,
        tertiaryBorderColor: line,
        lineColor: ink2,
        textColor: ink1,
        mainBkg: surface2,
        nodeBorder: ink3,
        clusterBkg: surface,
        clusterBorder: line,
        edgeLabelBackground: surface,
        noteBkgColor: surface2,
        noteTextColor: ink1,
        noteBorderColor: line,
        actorBkg: surface2,
        actorBorder: ink3,
        actorTextColor: ink1,
        signalColor: ink2,
        signalTextColor: ink1,
      },
    });
    themedFor = key;
  }
  const id = `doc-mermaid-${++seq}`;
  try {
    const { svg } = await mermaid.render(id, code, scope);
    return svg;
  } finally {
    // Mermaid leaves its scratch element behind when the source fails to parse.
    document.getElementById(`d${id}`)?.remove();
    document.getElementById(id)?.remove();
  }
}
