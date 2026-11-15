/** NB-01 to NB-07: the handle ("+" and the grip), its tooltip and its menu. */
import { test, expect, row, seed, toGrip, tree, blocks } from './support';

const visible = (page: import('@playwright/test').Page) => page.locator('.lab-side').isVisible();

test('NB-01: moving onto a block shows its "+" and grip at once, fading in over 200 ms', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [
    { type: 'paragraph', content: 'A paragraph' },
    { type: 'heading', props: { level: 2 }, content: 'A heading' },
    { type: 'bulletListItem', content: 'A bullet' },
    { type: 'checkListItem', content: 'A to-do' },
    { type: 'quote', content: 'A quote' },
  ]);
  for (const text of ['A paragraph', 'A heading', 'A bullet', 'A to-do', 'A quote']) {
    const r = await row(page, text);
    await person.glide({ x: r.textLeft + 40, y: r.y + r.h / 2 });
    await person.pause(60);
    await expect(page.locator('.lab-side-grip')).toBeVisible({ timeout: 300 });
    const g = (await page.locator('.lab-side-grip').boundingBox())!;
    expect(g.y + g.height / 2, `the grip sits on "${text}"`).toBeGreaterThanOrEqual(r.y - 1);
    expect(g.y + g.height / 2).toBeLessThanOrEqual(r.bottom + 1);
  }
  const anim = await page.locator('.lab-side').evaluate((el) => ({ name: getComputedStyle(el).animationName, ms: parseFloat(getComputedStyle(el).animationDuration) * 1000, ease: getComputedStyle(el).animationTimingFunction }));
  expect(anim).toEqual({ name: 'lab-fade', ms: 200, ease: 'ease-out' });
});

test('NB-02: the handle stays while the pointer goes left into the gutter and right past the text', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'A line to hover' }, { type: 'paragraph', content: 'Below it' }]);
  const r = await row(page, 'A line to hover');
  await person.glide({ x: r.textLeft + 30, y: r.y + r.h / 2 });
  await person.pause(250);
  // Left, in small steps, to 58 px left of the block (past the "+"), checking every step.
  for (let x = r.textLeft + 30; x >= r.boxLeft - 58; x -= 8) {
    await person.glide({ x, y: r.y + r.h / 2 }, 1);
    expect(await visible(page), `visible at x = block ${Math.round(x - r.boxLeft)}`).toBe(true);
  }
  // Right, past the end of the text.
  for (let x = r.boxLeft; x <= r.textRight + 300; x += 24) {
    await person.glide({ x, y: r.y + r.h / 2 }, 2);
    expect(await visible(page), `visible at x = text end + ${Math.round(x - r.textRight)}`).toBe(true);
  }
});

test('NB-03: the handle moves with the pointer to the next row and hides when it leaves the blocks', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Upper row' }, { type: 'paragraph', content: 'Lower row' }]);
  const up = await row(page, 'Upper row');
  const low = await row(page, 'Lower row');
  await person.glide({ x: up.textLeft + 30, y: up.y + up.h / 2 });
  await person.pause(250);
  await person.glide({ x: low.textLeft + 30, y: low.y + low.h / 2 }, 10);
  await person.pause(120);
  const g = (await page.locator('.lab-side-grip').boundingBox())!;
  expect(g.y + g.height / 2).toBeGreaterThan(low.y);
  expect(g.y + g.height / 2).toBeLessThan(low.bottom);
  // Up and out, onto the doc's title.
  const title = (await page.locator('.doc-title').boundingBox())!;
  await person.glide({ x: title.x + 60, y: title.y + title.height / 2 }, 14);
  await person.pause(150);
  expect(await visible(page)).toBe(false);
});

test('NB-04: the grip is centred on the first line of every kind of block', async ({ page, person, docId }) => {
  void docId;
  const kinds = [
    { type: 'paragraph', content: 'Paragraph' },
    { type: 'heading', props: { level: 1 }, content: 'Heading one' },
    { type: 'heading', props: { level: 2 }, content: 'Heading two' },
    { type: 'heading', props: { level: 3 }, content: 'Heading three' },
    { type: 'bulletListItem', content: 'Bullet' },
    { type: 'numberedListItem', content: 'Numbered' },
    { type: 'checkListItem', content: 'To-do' },
    { type: 'toggleListItem', content: 'Toggle' },
    { type: 'quote', content: 'Quote' },
  ];
  await seed(page, kinds);
  for (const k of kinds) {
    const r = await row(page, k.content);
    await person.glide({ x: r.textLeft + 20, y: r.y + r.h / 2 });
    await person.pause(220);
    const g = (await page.locator('.lab-side-grip').boundingBox())!;
    const line = await page.evaluate((text) => {
      const inline = Array.from(document.querySelectorAll('.doc-body-v2 .bn-inline-content')).find((e) => (e as HTMLElement).innerText.trim() === text)!;
      const walker = document.createTreeWalker(inline, NodeFilter.SHOW_TEXT);
      const node = walker.nextNode()!;
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, 1);
      const rr = range.getBoundingClientRect();
      return rr.y + rr.height / 2;
    }, k.content);
    expect(Math.abs(g.y + g.height / 2 - line), `${k.content}: grip centre vs first line`).toBeLessThanOrEqual(4);
  }
});

test('NB-05: resting on the grip shows the two-line tooltip after about 250 ms', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Rest on my grip' }]);
  const r = await row(page, 'Rest on my grip');
  await person.glide({ x: r.textLeft + 24, y: r.y + r.h / 2 });
  await person.pause(300);
  const g = (await page.locator('.lab-side-grip').boundingBox())!;
  // A quick last move onto the grip, then time the rest from there.
  await person.glide({ x: g.x + g.width / 2, y: g.y + g.height / 2 }, 3);
  await person.pause(110);
  await expect(page.locator('.lab-tip'), 'no tooltip ~110 ms in').toHaveCount(0);
  await person.pause(330);
  const tip = page.locator('.lab-tip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Drag to move');
  await expect(tip).toContainText('Click to open menu');
});

test('NB-06: clicking "+" adds an empty block below and opens the slash menu there', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Alpha' }, { type: 'paragraph', content: 'Omega' }]);
  const r = await row(page, 'Alpha');
  await person.glide({ x: r.textLeft + 20, y: r.y + r.h / 2 });
  await person.pause(250);
  const plus = (await page.locator('.lab-side-add').boundingBox())!;
  await person.click({ x: plus.x + plus.width / 2, y: plus.y + plus.height / 2 });
  await expect(page.locator('.lab-slash')).toBeVisible();
  const list = await blocks(page);
  expect(list[0].text).toBe('Alpha');
  expect(list[1].type).toBe('paragraph');
  expect(list[1].text.replace('/', '')).toBe('');
  expect(list[2].text).toBe('Omega');
  // The menu works from there: type to filter, Enter applies.
  await person.type('head');
  await person.press('Enter');
  expect((await blocks(page))[1].type).toBe('heading');
});

test('NB-07: clicking the grip tints the block and opens its menu with the search field focused', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Open my menu' }, { type: 'paragraph', content: 'Next' }]);
  const g = await toGrip(person, 'Open my menu');
  await person.click({ x: g.x + g.width / 2, y: g.y + g.height / 2 });
  const menu = page.locator('.lab-block-menu');
  await expect(menu).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.classList.contains('lab-menu-search'))).toBe(true);
  const tint = await page.evaluate(() => {
    const c = document.querySelector('.doc-body-v2 [data-menu-open] .bn-block-content') as HTMLElement | null;
    return c ? getComputedStyle(c).backgroundColor : null;
  });
  expect(tint).toBe('rgba(35, 131, 226, 0.14)');
  for (const label of ['Text', 'Heading 1', 'Bulleted list', 'Toggle list']) await expect(menu.getByRole('menuitem', { name: label, exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /^Duplicate/ })).toContainText('Ctrl+D');
  await expect(menu.getByRole('menuitem', { name: /^Delete/ })).toBeVisible();
  // Typing filters the actions; Enter runs the first.
  await person.type('dupl');
  await person.press('Enter');
  expect(await tree(page)).toBe('Open my menu | Open my menu | Next');
  await expect(menu).toHaveCount(0);
});
