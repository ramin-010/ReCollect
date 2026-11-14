'use client';

/**
 * Saving a drawn diagram (a Mermaid SVG) as a file: SVG as drawn, or PNG at twice its size. The
 * page colour goes behind it, so a diagram drawn in the dark theme stays readable on white.
 */

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A file name from a title: "Request flow" → "request-flow". */
export function fileBase(title: string, fallback = 'diagram'): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || fallback;
}

/** The SVG's drawing box (its viewBox), else its measured size. */
export function svgBox(svg: SVGSVGElement): { x: number; y: number; w: number; h: number } {
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
  const r = svg.getBoundingClientRect();
  return { x: 0, y: 0, w: r.width || 800, h: r.height || 600 };
}

/** The SVG text drawn at its own size (Mermaid's is 100% wide with a max-width), and that size. */
export function sizedSvg(svgText: string): { text: string; w: number; h: number } {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement as unknown as SVGSVGElement;
  const box = svgBox(svg);
  svg.setAttribute('width', String(Math.ceil(box.w)));
  svg.setAttribute('height', String(Math.ceil(box.h)));
  svg.style.removeProperty('max-width');
  return { text: new XMLSerializer().serializeToString(svg), w: box.w, h: box.h };
}

/** A standalone copy of the SVG: its own size, the page colour behind it. */
function standalone(svgText: string, background: string): { text: string; w: number; h: number } {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement as unknown as SVGSVGElement;
  const box = svgBox(svg);
  svg.setAttribute('width', String(Math.ceil(box.w)));
  svg.setAttribute('height', String(Math.ceil(box.h)));
  svg.style.removeProperty('max-width');
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const bg = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', String(box.x));
  bg.setAttribute('y', String(box.y));
  bg.setAttribute('width', String(box.w));
  bg.setAttribute('height', String(box.h));
  bg.setAttribute('fill', background);
  svg.insertBefore(bg, svg.firstChild);
  return { text: new XMLSerializer().serializeToString(svg), w: box.w, h: box.h };
}

export function downloadSvg(svgText: string, name: string, background: string) {
  save(new Blob([standalone(svgText, background).text], { type: 'image/svg+xml' }), `${name}.svg`);
}

/** PNG at 2× (sharp on a laptop screen). Rejects when the browser won't draw the SVG to a canvas. */
export async function downloadPng(svgText: string, name: string, background: string) {
  const { text, w, h } = standalone(svgText, background);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  await img.decode();
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The PNG could not be made');
  save(blob, `${name}.png`);
}
