/** NB-12 to NB-15: block selection (Esc, arrows, Shift+arrows, Ctrl+D, Backspace, the margin marquee). */
import { test, expect, row, seed, tree, clickEnd, selectedTexts } from './support';

const three = [
  { type: 'paragraph', content: 'Alpha' },
  { type: 'paragraph', content: 'Bravo' },
  { type: 'paragraph', content: 'Charlie' },
];

test('NB-12: Esc selects the block holding the caret, with the 14 % tint inset 2 px', async ({ page, person, docId }) => {
  void docId;
  await seed(page, three);
  await clickEnd(person, 'Bravo');
  await person.press('Escape');
  expect(await selectedTexts(page)).toEqual(['Bravo']);
  const look = await page.evaluate(() => {
    const c = document.querySelector('.doc-body-v2 [data-block-selected] .bn-block-content') as HTMLElement;
    const cs = getComputedStyle(c);
    return { bg: cs.backgroundColor, radius: cs.borderRadius, inset: cs.boxShadow.includes('inset') && cs.boxShadow.includes('2px') };
  });
  expect(look).toEqual({ bg: 'rgba(35, 131, 226, 0.14)', radius: '4px', inset: true });
  // Typing doesn't change the text while blocks are selected (the caret left the text).
  await person.type('x');
  expect(await tree(page)).toBe('Alpha | Bravo | Charlie');
});

test('NB-13: with blocks selected, ↑/↓ move the selection and Shift+↑/↓ extend it', async ({ page, person, docId }) => {
  void docId;
  await seed(page, three);
  await clickEnd(person, 'Bravo');
  await person.press('Escape');
  await person.press('ArrowDown');
  expect(await selectedTexts(page)).toEqual(['Charlie']);
  await person.press('ArrowUp');
  expect(await selectedTexts(page)).toEqual(['Bravo']);
  await person.press('Shift+ArrowUp');
  expect(await selectedTexts(page)).toEqual(['Alpha', 'Bravo']);
  await person.press('Shift+ArrowDown');
  expect(await selectedTexts(page)).toEqual(['Bravo']);
  await person.press('Shift+ArrowDown');
  expect(await selectedTexts(page)).toEqual(['Bravo', 'Charlie']);
});

test('NB-14: with blocks selected, Ctrl+D duplicates them and Backspace deletes them', async ({ page, person, docId }) => {
  void docId;
  await seed(page, three);
  await clickEnd(person, 'Bravo');
  await person.press('Escape');
  await person.press('Control+d');
  expect(await tree(page)).toBe('Alpha | Bravo | Bravo | Charlie');
  // The copy is the selection now; Backspace removes it.
  await person.press('Backspace');
  expect(await tree(page)).toBe('Alpha | Bravo | Charlie');
  // Two at once.
  await clickEnd(person, 'Alpha');
  await person.press('Escape');
  await person.press('Shift+ArrowDown');
  await person.press('Delete');
  expect(await tree(page)).toBe('Charlie');
});

test('NB-15: a drag from the left margin draws a marquee and selects the blocks it touches, live', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [...three, { type: 'paragraph', content: 'Delta' }]);
  const a = await row(page, 'Alpha');
  const c = await row(page, 'Charlie');
  // Start in the margin, left of the handle's reach, a little above Alpha.
  const start = { x: a.boxLeft - 90, y: a.y + 4 };
  await person.glide(start);
  await person.pause(150);
  await page.mouse.down();
  await person.glide({ x: a.textLeft + 40, y: a.y + a.h * 0.6 }, 12);
  expect(await selectedTexts(page), 'live, after touching Alpha').toEqual(['Alpha']);
  await expect(page.locator('.lab-marquee')).toBeVisible();
  await person.glide({ x: c.textLeft + 40, y: c.y + c.h * 0.5 }, 20);
  expect(await selectedTexts(page), 'live, down to Charlie').toEqual(['Alpha', 'Bravo', 'Charlie']);
  await page.mouse.up();
  await person.pause(200);
  await expect(page.locator('.lab-marquee')).toHaveCount(0);
  expect(await selectedTexts(page), 'kept after release').toEqual(['Alpha', 'Bravo', 'Charlie']);
  await person.press('Backspace');
  expect(await tree(page)).toBe('Delta');
});
