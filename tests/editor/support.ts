/**
 * Shared pieces for the editor tests: a fresh doc per test (QA account, deleted after), the new
 * editor opened behind ?editor=v2, and a "person" who moves the pointer in small steps, pauses and
 * types with gaps between keys (memory test-ui-like-a-person: jump-to-target checks hid real bugs).
 */
import { test as base, expect, type Page } from '@playwright/test';

export const API = 'http://localhost:8002';
type Point = { x: number; y: number };
export type Seed = { type: string; content?: string; props?: Record<string, unknown>; children?: Seed[] };

/** A person at the keyboard and mouse: steady glides, short pauses, keys with gaps. */
export class Person {
  at: Point = { x: 1200, y: 600 };
  constructor(readonly page: Page) {}
  async glide(to: Point, steps = 18) {
    const from = this.at;
    for (let i = 1; i <= steps; i += 1) {
      await this.page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
      await this.page.waitForTimeout(16);
    }
    this.at = to;
  }
  async pause(ms = 300) {
    await this.page.waitForTimeout(ms);
  }
  async click(to: Point) {
    await this.glide(to);
    await this.pause(90);
    await this.page.mouse.click(to.x, to.y);
    await this.pause(120);
  }
  async type(text: string) {
    await this.page.keyboard.type(text, { delay: 40 });
    await this.pause(120);
  }
  async press(key: string) {
    await this.page.keyboard.press(key);
    await this.pause(140);
  }
}

/** Where a block sits: its row (the block's own content), its text's start, its id. */
export type Row = { x: number; y: number; w: number; h: number; right: number; bottom: number; textLeft: number; textRight: number; boxLeft: number; id: string; type: string };

export async function row(page: Page, text: string): Promise<Row> {
  const r = await page.evaluate((text) => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.doc-body-v2 .bn-block-content'));
    const el = els.find((e) => (e.querySelector('.bn-inline-content') as HTMLElement | null)?.innerText.trim() === text);
    if (!el) return null;
    const box = el.closest('[data-node-type="blockContainer"]') as HTMLElement;
    const rr = el.getBoundingClientRect();
    const inline = el.querySelector('.bn-inline-content') as HTMLElement;
    const ir = inline.getBoundingClientRect();
    // The text's own extent (a range over its characters), not the inline box.
    const range = document.createRange();
    range.selectNodeContents(inline);
    const tr = range.getBoundingClientRect();
    return { x: rr.x, y: rr.y, w: rr.width, h: rr.height, right: rr.right, bottom: rr.bottom, textLeft: ir.left, textRight: tr.width ? tr.right : ir.left, boxLeft: box.getBoundingClientRect().left, id: box.getAttribute('data-id') ?? '', type: el.getAttribute('data-content-type') ?? '' };
  }, text);
  if (!r) throw new Error(`No block with the text "${text}"`);
  return r;
}

/** The doc as the editor holds it, compact: "One | Two[Child] | Three". */
export async function tree(page: Page): Promise<string> {
  return page.evaluate(() => {
    type B = { type: string; content?: { text?: string }[]; children?: B[] };
    const walk = (bs: B[]): string[] =>
      bs.map((b) => {
        const t = (Array.isArray(b.content) ? b.content : []).map((c) => c.text ?? '').join('');
        return b.children?.length ? `${t}[${walk(b.children).join(', ')}]` : t;
      });
    const ed = (window as unknown as { __labEditor: { document: B[] } }).__labEditor;
    return walk(ed.document).filter(Boolean).join(' | ');
  });
}

/** Every block with its type, text and props, in document order (children after their parent). */
export async function blocks(page: Page): Promise<{ type: string; text: string; props: Record<string, unknown>; depth: number }[]> {
  return page.evaluate(() => {
    type B = { type: string; props: Record<string, unknown>; content?: { text?: string; styles?: Record<string, unknown> }[]; children?: B[] };
    const out: { type: string; text: string; props: Record<string, unknown>; depth: number }[] = [];
    const walk = (bs: B[], depth: number) => {
      for (const b of bs) {
        out.push({ type: b.type, text: (Array.isArray(b.content) ? b.content : []).map((c) => c.text ?? '').join(''), props: b.props, depth });
        if (b.children?.length) walk(b.children, depth + 1);
      }
    };
    walk((window as unknown as { __labEditor: { document: B[] } }).__labEditor.document, 0);
    return out;
  });
}

/** Fills the doc with blocks through the editor's own API (setup only; the behaviour under test is done by hand). */
export async function seed(page: Page, content: Seed[]) {
  await page.evaluate((content) => {
    const ed = (window as unknown as { __labEditor: { document: unknown[]; replaceBlocks: (a: unknown[], b: unknown[]) => void } }).__labEditor;
    ed.replaceBlocks(ed.document, content);
  }, content);
  await page.waitForTimeout(400);
}

/** Puts the caret at the end of a block's text, by clicking there like a person. */
export async function clickEnd(person: Person, text: string) {
  const r = await row(person.page, text);
  await person.click({ x: r.textRight - 1, y: r.y + r.h / 2 });
  await person.press('End');
}

/** Puts the caret at the start of a block's text. */
export async function clickStart(person: Person, text: string) {
  const r = await row(person.page, text);
  await person.click({ x: r.textLeft + 2, y: r.y + r.h / 2 });
  await person.press('Home');
}

/** Hovers a block's row, then glides onto its grip; returns the grip's box. */
export async function toGrip(person: Person, text: string) {
  const r = await row(person.page, text);
  await person.glide({ x: r.textLeft + 24, y: r.y + r.h / 2 });
  await person.pause(320);
  const grip = person.page.locator('.lab-side-grip');
  await expect(grip).toBeVisible();
  const g = (await grip.boundingBox())!;
  await person.glide({ x: g.x + g.width / 2, y: g.y + g.height / 2 }, 10);
  await person.pause(200);
  return g;
}

/** Drags a block by its grip, slowly, to a point worked out once the drag has begun; returns what showed before the drop. */
export async function dragBlock(person: Person, text: string, target: () => Promise<Point>, beforeDrop?: () => Promise<void>) {
  await toGrip(person, text);
  await person.page.mouse.down();
  await person.pause(120);
  await person.glide({ x: person.at.x + 6, y: person.at.y + 6 }, 4);
  await person.glide(await target(), 30);
  await person.pause(450);
  if (beforeDrop) await beforeDrop();
  await person.page.mouse.up();
  await person.pause(700);
}

/** What the drop shows right now: BlockNote's sibling line, our nesting line, the tinted parent. */
export async function dropVisuals(page: Page) {
  return page.evaluate(() => {
    const vis = (el: Element | null) => (el && getComputedStyle(el).display !== 'none' ? el.getBoundingClientRect() : null);
    const nest = vis(document.querySelector('.lab-nest-line'));
    const cur = vis(document.querySelector('.prosemirror-dropcursor-block'));
    const tint = document.querySelector('.doc-body-v2 [data-nest-target="true"] .bn-inline-content') as HTMLElement | null;
    const box = (r: DOMRect | null) => (r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null);
    return { nest: box(nest), cursor: box(cur), tint: tint ? tint.innerText.split('\n')[0] : null };
  });
}

/** The blocks shown with the block-selection tint (NB-12 to NB-15), by their text. */
export async function selectedTexts(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.doc-body-v2 [data-block-selected]')).map((el) => ((el.querySelector('.bn-inline-content') as HTMLElement | null)?.innerText ?? '').trim()),
  );
}

async function newDoc(page: Page, title: string): Promise<string> {
  const r = await page.request.post(`${API}/api/docs`, { data: { title } });
  expect(r.ok(), `create a doc: ${r.status()}`).toBeTruthy();
  return (await r.json()).data._id as string;
}

async function removeDoc(page: Page, id: string) {
  await page.request.post(`${API}/api/docs/${id}/trash`);
  await page.request.delete(`${API}/api/docs/${id}`);
}

export async function openV2(page: Page, id: string) {
  await page.goto(`/docs/${id}?editor=v2`, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForSelector('.doc-body-v2 .bn-editor', { timeout: 60_000 });
  await page.waitForFunction(() => !!(window as unknown as { __labEditor?: unknown }).__labEditor);
  await page.waitForTimeout(900);
}

/** Each test gets its own doc, opened in the new editor, and a person; errors on the page fail the test. */
export const test = base.extend<{ docId: string; person: Person; pageErrors: string[] }>({
  pageErrors: async ({ page }, provide) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await provide(errors);
    expect(errors, 'errors on the page').toEqual([]);
  },
  docId: async ({ page, pageErrors }, provide) => {
    void pageErrors;
    const id = await newDoc(page, 'Editor test (delete me)');
    await openV2(page, id);
    await provide(id);
    await removeDoc(page, id);
  },
  person: async ({ page }, provide) => {
    await provide(new Person(page));
  },
});

export { expect };
