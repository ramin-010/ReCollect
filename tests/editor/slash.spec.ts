/** NB-24: the slash menu (filter, arrows, Enter, Esc, no match), and a query with a space. */
import { test, expect, seed, blocks, clickEnd } from './support';

test('NB-24: "/" opens the menu; typing filters, arrows move, Enter applies, Esc keeps the text, no match closes it', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('/');
  const menu = page.locator('.lab-slash');
  await expect(menu).toBeVisible();
  await person.type('list');
  const sel = () => menu.locator('[data-selected]').innerText();
  const items = await menu.locator('[role="option"]').count();
  expect(items, 'several kinds of list match "list"').toBeGreaterThan(2);
  const first = await sel();
  await person.press('ArrowDown');
  const second = await sel();
  expect(second).not.toBe(first);
  await person.press('ArrowUp');
  expect(await sel()).toBe(first);
  await person.press('ArrowDown');
  await person.press('Enter');
  let list = await blocks(page);
  const kinds: Record<string, string> = { bullet: 'bulletListItem', numbered: 'numberedListItem', check: 'checkListItem', toggle: 'toggleListItem' };
  const want = Object.entries(kinds).find(([k]) => second.toLowerCase().includes(k))?.[1];
  expect(list[1].type, `Enter applies "${second}"`).toBe(want);
  expect(list[1].text).toBe('');
  await expect(menu).toHaveCount(0);

  // Esc closes the menu and keeps what was typed.
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('/head');
  await expect(menu).toBeVisible();
  await person.press('Escape');
  await expect(menu).toHaveCount(0);
  list = await blocks(page);
  expect(list[1].text).toBe('/head');

  // A query with no match closes it.
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('/zzzqx');
  await expect(menu).toHaveCount(0);

  // A space inside the query doesn't close it ("/heading 2").
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('/heading 2');
  await expect(menu).toBeVisible();
  expect(await sel()).toMatch(/Heading 2/i);
  await person.press('Enter');
  list = await blocks(page);
  expect([list[1].type, list[1].props.level]).toEqual(['heading', 2]);
});
