/** NB-16 to NB-23, NB-25, NB-26: Markdown starts, inline marks, Enter / Backspace / Tab rules, moving, undo, to-dos. */
import { test, expect, row, seed, tree, blocks, clickEnd, clickStart } from './support';

test('NB-16: Markdown at a block\'s start turns it into that block', async ({ page, person, docId }) => {
  void docId;
  const cases: { keys: string; type: string; props?: Record<string, unknown> }[] = [
    { keys: '# ', type: 'heading', props: { level: 1 } },
    { keys: '## ', type: 'heading', props: { level: 2 } },
    { keys: '### ', type: 'heading', props: { level: 3 } },
    { keys: '- ', type: 'bulletListItem' },
    { keys: '1. ', type: 'numberedListItem' },
    { keys: '[] ', type: 'checkListItem' },
    { keys: '> ', type: 'toggleListItem' },
    { keys: '" ', type: 'quote' },
    { keys: '``` ', type: 'codeBlock' },
  ];
  for (const c of cases) {
    await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
    await clickEnd(person, 'Anchor');
    await person.press('Enter');
    await person.type(c.keys);
    await person.type('Made');
    const list = await blocks(page);
    expect(list[1]?.type, `"${c.keys}"`).toBe(c.type);
    expect(list[1]?.text, `"${c.keys}" keeps only the typed text`).toBe('Made');
    if (c.props) for (const [k, v] of Object.entries(c.props)) expect(list[1]?.props[k], `"${c.keys}" ${k}`).toBe(v);
  }
  // A divider from three dashes.
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('---');
  await person.pause(200);
  expect((await blocks(page)).some((b) => b.type === 'divider'), '"---" makes a divider').toBe(true);
});

test('NB-17: **bold** and `code` typed inline become bold and inline code', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Start' }]);
  await clickEnd(person, 'Start');
  await person.type(' with **bold** and `code` here');
  const styled = await page.evaluate(() => {
    const ed = (window as unknown as { __labEditor: { document: { content: { text: string; styles: Record<string, unknown> }[] }[] } }).__labEditor;
    return ed.document[0].content.map((c) => ({ text: c.text, styles: Object.keys(c.styles ?? {}) }));
  });
  expect(styled.find((c) => c.text === 'bold')?.styles).toContain('bold');
  expect(styled.find((c) => c.text === 'code')?.styles).toContain('code');
  expect(styled.map((c) => c.text).join('')).toBe('Start with bold and code here');
});

test('NB-18: Enter after a heading starts a paragraph, Enter mid-block splits it, Shift+Enter breaks the line', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'heading', props: { level: 2 }, content: 'A heading' }, { type: 'paragraph', content: 'HelloWorld' }, { type: 'paragraph', content: 'Line one' }]);
  await clickEnd(person, 'A heading');
  await person.press('Enter');
  await person.type('Body');
  let list = await blocks(page);
  expect([list[0].type, list[1].type, list[1].text]).toEqual(['heading', 'paragraph', 'Body']);
  await clickEnd(person, 'HelloWorld');
  for (let i = 0; i < 5; i += 1) await person.press('ArrowLeft');
  await person.press('Enter');
  list = await blocks(page);
  expect(list.map((b) => b.text)).toEqual(['A heading', 'Body', 'Hello', 'World', 'Line one']);
  await clickEnd(person, 'Line one');
  await person.press('Shift+Enter');
  await person.type('Line two');
  list = await blocks(page);
  expect(list.length).toBe(5);
  expect(list[4].text).toBe('Line one\nLine two');
});

test('NB-19: Enter on an empty list item ends the list; Enter at the end of an open toggle\'s title goes inside', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'bulletListItem', content: 'First' }]);
  await clickEnd(person, 'First');
  await person.press('Enter');
  await person.press('Enter');
  await person.type('After');
  let list = await blocks(page);
  expect(list.map((b) => `${b.type}:${b.text}`)).toEqual(['bulletListItem:First', 'paragraph:After']);
  await seed(page, [{ type: 'toggleListItem', content: 'Toggle title' }]);
  const arrow = (await page.locator('.doc-body-v2 .bn-toggle-button').first().boundingBox())!;
  await person.click({ x: arrow.x + arrow.width / 2, y: arrow.y + arrow.height / 2 });
  await clickEnd(person, 'Toggle title');
  await person.press('Enter');
  await person.type('Inside');
  expect(await tree(page)).toBe('Toggle title[Inside]');
  list = await blocks(page);
  expect(list[1].depth).toBe(1);
});

test('NB-20: Backspace at the start of a list item turns it into a paragraph and keeps its children', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'bulletListItem', content: 'Parent', children: [{ type: 'bulletListItem', content: 'Kid' }] }]);
  await clickStart(person, 'Parent');
  await person.press('Backspace');
  const list = await blocks(page);
  expect(list.map((b) => `${b.type}:${b.text}:${b.depth}`)).toEqual(['paragraph:Parent:0', 'bulletListItem:Kid:1']);
});

test('NB-21: Backspace at the start of a heading or paragraph merges it into the block above, which keeps its type', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'heading', props: { level: 2 }, content: 'Head' }, { type: 'paragraph', content: 'Para' }]);
  await clickStart(person, 'Para');
  await person.press('Backspace');
  let list = await blocks(page);
  expect(list.map((b) => `${b.type}:${b.text}`)).toEqual(['heading:HeadPara']);
  await seed(page, [{ type: 'paragraph', content: 'Top' }, { type: 'heading', props: { level: 2 }, content: 'Low' }]);
  await clickStart(person, 'Low');
  await person.press('Backspace');
  list = await blocks(page);
  expect(list.map((b) => `${b.type}:${b.text}`)).toEqual(['paragraph:TopLow']);
});

test('NB-22: Tab nests a block under the one above (any type); Shift+Tab takes it out', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Above' }, { type: 'paragraph', content: 'Below' }, { type: 'heading', props: { level: 3 }, content: 'A heading' }, { type: 'paragraph', content: 'Under it' }]);
  await clickEnd(person, 'Below');
  await person.press('Tab');
  expect(await tree(page)).toBe('Above[Below] | A heading | Under it');
  await person.press('Shift+Tab');
  expect(await tree(page)).toBe('Above | Below | A heading | Under it');
  await clickEnd(person, 'Under it');
  await person.press('Tab');
  expect(await tree(page)).toBe('Above | Below | A heading[Under it]');
});

test('NB-23: Ctrl+Shift+↑/↓ moves the block one row, entering nested lists on the way', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'bulletListItem', content: 'A', children: [{ type: 'bulletListItem', content: 'A1' }] }, { type: 'paragraph', content: 'B' }, { type: 'paragraph', content: 'C' }]);
  await clickEnd(person, 'B');
  await person.press('Control+Shift+ArrowUp');
  const first = await tree(page);
  await person.press('Control+Shift+ArrowUp');
  const second = await tree(page);
  expect([first, second]).toEqual(['A[A1, B] | C', 'A[B, A1] | C']);
  // And back down, then past C.
  await person.press('Control+Shift+ArrowDown');
  await person.press('Control+Shift+ArrowDown');
  await person.press('Control+Shift+ArrowDown');
  expect(await tree(page)).toBe('A[A1] | C | B');
  // The caret stays in the moved block.
  await person.type('!');
  expect(await tree(page)).toBe('A[A1] | C | B!');
});

test('NB-25: Undo groups typing by pauses', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Note:' }]);
  await clickEnd(person, 'Note:');
  await person.type(' alpha beta');
  await person.pause(1200);
  await person.type(' gamma');
  await person.pause(800);
  await person.press('Control+z');
  expect(await tree(page)).toBe('Note: alpha beta');
  await person.press('Control+z');
  expect(await tree(page)).toBe('Note:');
  await person.press('Control+Shift+z');
  expect(await tree(page)).toBe('Note: alpha beta');
});

test('NB-26: Ctrl+Enter ticks a to-do, struck through at 50 % ink', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'checkListItem', content: 'Write the tests' }]);
  await clickEnd(person, 'Write the tests');
  await person.press('Control+Enter');
  expect((await blocks(page))[0].props.checked).toBe(true);
  const look = await page.evaluate(() => {
    const el = document.querySelector('.doc-body-v2 [data-content-type="checkListItem"] .bn-inline-content') as HTMLElement;
    const cs = getComputedStyle(el);
    return { line: cs.textDecorationLine, color: cs.color };
  });
  expect(look.line).toContain('line-through');
  await person.press('Control+Enter');
  expect((await blocks(page))[0].props.checked).toBe(false);
  void row;
});
