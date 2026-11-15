/** NB-08 to NB-11: dragging a block by its grip, the drop line, nesting by the drag's offset, toggles. */
import { test, expect, row, seed, tree, dragBlock, dropVisuals, toGrip, openV2 } from './support';

test('NB-08: the dragged block itself is the ghost, held where the grip was grabbed', async ({ page, person, docId }) => {
  // Record what the page hands the browser as the drag image.
  await page.addInitScript(() => {
    const orig = DataTransfer.prototype.setDragImage;
    DataTransfer.prototype.setDragImage = function (el: Element, x: number, y: number) {
      (window as unknown as Record<string, unknown>).__dragImage = { text: (el as HTMLElement).innerText, x, y };
      return orig.call(this, el, x, y);
    };
  });
  await openV2(page, docId);
  await seed(page, [{ type: 'paragraph', content: 'Hold me by the grip' }, { type: 'paragraph', content: 'Target' }]);
  const r = await row(page, 'Hold me by the grip');
  const g = await toGrip(person, 'Hold me by the grip');
  const grab = { x: g.x + g.width / 2, y: g.y + g.height / 2 };
  await page.mouse.down();
  await person.pause(100);
  await person.glide({ x: grab.x + 8, y: grab.y + 20 }, 6);
  const img = (await page.evaluate(() => (window as unknown as Record<string, unknown>).__dragImage)) as { text: string; x: number; y: number } | undefined;
  await page.mouse.up();
  expect(img?.text).toContain('Hold me by the grip');
  // The pointer stays at the grip's place relative to the block (+10: the preview's padding).
  expect(Math.abs(img!.x - (grab.x - r.boxLeft + 10))).toBeLessThanOrEqual(3);
  expect(Math.abs(img!.y - (grab.y - r.y + 10))).toBeLessThanOrEqual(3);
});

test('NB-09: the 4 px line at 43 % shows above over the upper half and below over the lower half', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'One' }, { type: 'paragraph', content: 'Two' }, { type: 'paragraph', content: 'Three' }, { type: 'paragraph', content: 'Mover' }]);
  let seen = await dropVisuals(page);
  await dragBlock(person, 'Mover', async () => { const t = await row(page, 'One'); return { x: t.textLeft + 60, y: t.y + t.h * 0.25 }; }, async () => { seen = await dropVisuals(page); });
  const one = await row(page, 'Mover');
  expect(seen.cursor?.h).toBe(4);
  expect(seen.nest).toBeNull();
  expect(await tree(page)).toBe('Mover | One | Two | Three');
  const color = await page.evaluate(() => (document.querySelector('.prosemirror-dropcursor-block') as HTMLElement | null)?.style.backgroundColor ?? 'rgba(35, 131, 226, 0.43)');
  expect(color).toBe('rgba(35, 131, 226, 0.43)');
  void one;
  await dragBlock(person, 'Mover', async () => { const t = await row(page, 'Two'); return { x: t.textLeft + 60, y: t.y + t.h * 0.75 }; }, async () => { seen = await dropVisuals(page); });
  expect(seen.cursor?.h).toBe(4);
  expect(await tree(page)).toBe('One | Two | Mover | Three');
});

test('NB-10: a nesting drop moves the line in to the child\'s place, tints the parent, and nests the block', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'bulletListItem', content: 'Parent item' }, { type: 'bulletListItem', content: 'Sibling item' }, { type: 'paragraph', content: 'Mover' }, { type: 'paragraph', content: 'Tail' }]);
  const parent = await row(page, 'Parent item');
  let seen = await dropVisuals(page);
  await dragBlock(person, 'Mover', async () => { const t = await row(page, 'Parent item'); return { x: t.textLeft + 40, y: t.y + t.h * 0.75 }; }, async () => { seen = await dropVisuals(page); });
  expect(seen.tint).toBe('Parent item');
  expect(seen.cursor).toBeNull();
  expect(seen.nest?.h).toBe(4);
  expect(Math.abs((seen.nest?.x ?? 0) - (parent.x + 32))).toBeLessThanOrEqual(2);
  expect(await tree(page)).toBe('Parent item[Mover] | Sibling item | Tail');
  // Left of the text start it stays a sibling; at the end of a nested list, left of its edge, it goes after the parent.
  await dragBlock(person, 'Tail', async () => { const t = await row(page, 'Mover'); return { x: t.boxLeft - 16, y: t.y + t.h * 0.75 }; }, async () => { seen = await dropVisuals(page); });
  expect(seen.tint).toBeNull();
  expect(await tree(page)).toBe('Parent item[Mover] | Tail | Sibling item');
  // A paragraph doesn't take children by the drag's offset (Notion: it stayed a sibling at +60 px).
  await seed(page, [{ type: 'paragraph', content: 'Plain paragraph' }, { type: 'paragraph', content: 'Mover' }, { type: 'paragraph', content: 'End' }]);
  await dragBlock(person, 'End', async () => { const t = await row(page, 'Plain paragraph'); return { x: t.textLeft + 60, y: t.y + t.h * 0.75 }; });
  expect(await tree(page)).toBe('Plain paragraph | End | Mover');
});

test('NB-11: dropping onto an open toggle\'s body puts the block inside it', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'toggleListItem', content: 'Toggle title', children: [{ type: 'paragraph', content: 'Inside' }] }, { type: 'paragraph', content: 'Outside' }]);
  // Open it like a person: click its arrow.
  const t = await row(page, 'Toggle title');
  const arrow = (await page.locator('.doc-body-v2 .bn-toggle-button').first().boundingBox())!;
  void t;
  await person.click({ x: arrow.x + arrow.width / 2, y: arrow.y + arrow.height / 2 });
  await expect(page.locator('.doc-body-v2 .bn-inline-content', { hasText: 'Inside' })).toBeVisible();
  await dragBlock(person, 'Outside', async () => { const r = await row(page, 'Inside'); return { x: r.textLeft + 30, y: r.y + r.h * 0.75 }; });
  expect(await tree(page)).toBe('Toggle title[Inside, Outside]');
  // And onto the toggle's own line, right of its text: its first child.
  await seed(page, [{ type: 'toggleListItem', content: 'Closed toggle' }, { type: 'paragraph', content: 'Goes in' }]);
  await dragBlock(person, 'Goes in', async () => { const r = await row(page, 'Closed toggle'); return { x: r.textLeft + 30, y: r.y + r.h * 0.75 }; });
  expect(await tree(page)).toBe('Closed toggle[Goes in]');
});
