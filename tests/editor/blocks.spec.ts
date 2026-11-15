/** Our own blocks in the new editor (phase 2): Diagram (Mermaid), the canvas's height grip and full screen, callout. */
import { test, expect, seed, blocks, clickEnd, openV2, row, tree } from './support';

const diagram = (page: import('@playwright/test').Page) => page.locator('.doc-body-v2 .lab-diagram').first();

test('Diagram: "/diagram" makes one; Enter is a new line; the drawing follows the source; Hide/Edit source; an error keeps the last drawing', async ({ page, person, docId }) => {
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('/diagram');
  await expect(page.locator('.lab-slash')).toBeVisible();
  await person.press('Enter');
  await expect(diagram(page)).toBeVisible();
  await expect(diagram(page)).toHaveAttribute('data-mode', 'edit');
  await person.type('flowchart LR');
  await person.press('Enter');
  await person.type('  A[Client] --> B[Server]');
  let list = await blocks(page);
  expect(list.filter((b) => b.type === 'diagram').length, 'one diagram block, Enter stayed inside it').toBe(1);
  expect(list.find((b) => b.type === 'diagram')?.text).toBe('flowchart LR\n  A[Client] --> B[Server]');
  await expect(diagram(page).locator('.doc-diagram-svg svg')).toBeVisible({ timeout: 15_000 });
  await expect(diagram(page).locator('.doc-diagram-svg')).toContainText('Client');
  // Hide the source: the drawing alone.
  const hide = diagram(page).getByRole('button', { name: 'Hide source' });
  const hb = (await hide.boundingBox())!;
  await person.click({ x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 });
  await expect(diagram(page)).toHaveAttribute('data-mode', 'preview');
  await expect(diagram(page).locator('.lab-diagram-source')).toBeHidden();
  // A double-click on the drawing opens the source again, caret at its end.
  const svgBox = (await diagram(page).locator('.doc-diagram-svg').boundingBox())!;
  await person.glide({ x: svgBox.x + svgBox.width / 2, y: svgBox.y + svgBox.height / 2 });
  await page.mouse.dblclick(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
  await person.pause(300);
  await expect(diagram(page)).toHaveAttribute('data-mode', 'edit');
  // Break it: the error shows and the last good drawing stays.
  await person.press('Enter');
  await person.type('  B --> ((');
  await expect(diagram(page).locator('.doc-diagram-error')).toBeVisible({ timeout: 10_000 });
  await expect(diagram(page).locator('.doc-diagram-svg svg')).toBeVisible();
  // Fix it again.
  for (let i = 0; i < 2; i += 1) await person.press('Backspace');
  await person.type('C[Cache]');
  await expect(diagram(page).locator('.doc-diagram-error')).toHaveCount(0, { timeout: 10_000 });
  await expect(diagram(page).locator('.doc-diagram-svg')).toContainText('Cache');
  // Shift+Enter leaves the diagram for a new paragraph.
  await person.press('Shift+Enter');
  await person.type('After the diagram');
  list = await blocks(page);
  expect(list.map((b) => b.type)).toEqual(['paragraph', 'diagram', 'paragraph', 'paragraph'].slice(0, list.length));
  expect(list[2].text).toBe('After the diagram');
  // Kept after a reload, drawn again.
  await openV2(page, docId);
  await expect(diagram(page).locator('.doc-diagram-svg')).toContainText('Cache', { timeout: 15_000 });
  await expect(diagram(page)).toHaveAttribute('data-mode', 'preview');
});

test('Diagram: "```mermaid " makes one, and Full screen opens the drawing on the float layer', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('```mermaid ');
  expect((await blocks(page))[1]?.type).toBe('diagram');
  await person.type('sequenceDiagram');
  await person.press('Enter');
  await person.type('  Alice->>Bob: Hello');
  await expect(diagram(page).locator('.doc-diagram-svg svg')).toBeVisible({ timeout: 15_000 });
  const fs = diagram(page).getByRole('button', { name: 'Full screen' });
  await diagram(page).hover();
  const fb = (await fs.boundingBox())!;
  await person.click({ x: fb.x + fb.width / 2, y: fb.y + fb.height / 2 });
  await expect(page.locator('.doc-diagram-full')).toBeVisible();
  await person.press('Escape');
  await expect(page.locator('.doc-diagram-full')).toHaveCount(0);
});

test('Canvas: the bottom grip changes its height in 8 px steps; full screen opens and closes', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Above the board' }, { type: 'canvas', props: { canvasId: `cv_test_${Date.now()}`, height: 440 } }, { type: 'paragraph', content: 'Below the board' }]);
  const surface = page.locator('.doc-body-v2 .doc-canvas-surface').first();
  await expect(surface).toBeVisible();
  // Bring the whole board into the window first, as a person scrolls to it (its bottom grip can sit
  // below a 730 px window under the doc's property rows).
  await surface.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await person.pause(300);
  const before = (await surface.boundingBox())!;
  expect(Math.round(before.height)).toBe(440);
  // Slowly drag the bottom edge down by about 85 px.
  await person.glide({ x: before.x + before.width / 2, y: before.y + before.height - 40 });
  await person.pause(250);
  const grip = (await page.locator('.doc-body-v2 .doc-canvas-grip').first().boundingBox())!;
  await person.glide({ x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }, 8);
  await page.mouse.down();
  await person.glide({ x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 + 85 }, 24);
  await person.pause(200);
  await page.mouse.up();
  await person.pause(400);
  const height = (await blocks(page)).find((b) => b.type === 'canvas')?.props.height as number;
  expect(height % 8, 'snapped to 8 px').toBe(0);
  expect(height).toBeGreaterThanOrEqual(520);
  expect(height).toBeLessThanOrEqual(528);
  expect(Math.round((await surface.boundingBox())!.height)).toBe(height);
  // Full screen from the board's view bar.
  await person.glide({ x: before.x + before.width / 2, y: before.y + 120 });
  await person.pause(300);
  const full = page.locator('.doc-body-v2 .doc-canvas').getByRole('button', { name: 'Full screen' });
  // The taller board's view bar is below the window now: scroll to it, as a person would.
  await full.scrollIntoViewIfNeeded();
  await person.pause(200);
  const fb = (await full.boundingBox())!;
  await person.click({ x: fb.x + fb.width / 2, y: fb.y + fb.height / 2 });
  await expect(page.locator('.doc-canvas-full')).toBeVisible();
  await expect(page.locator('.doc-body-v2 .doc-canvas-away')).toBeVisible();
  const exit = page.locator('.doc-canvas-full').getByRole('button', { name: 'Exit full screen' });
  const eb = (await exit.boundingBox())!;
  await person.click({ x: eb.x + eb.width / 2, y: eb.y + eb.height / 2 });
  await expect(page.locator('.doc-canvas-full')).toHaveCount(0);
  void row;
});

test('Image: "/image" opens our panel; a link puts the picture in; Upload sends a chosen file through the upload', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('/image');
  await person.press('Enter');
  // The empty image block's "Add image" opens the panel (BlockNote opens it at once for a new block).
  const panel = page.locator('.lab-file-panel');
  if (!(await panel.isVisible())) {
    const add = page.locator('.doc-body-v2 [data-content-type="image"] .bn-add-file-button').first();
    const ab = (await add.boundingBox())!;
    await person.click({ x: ab.x + ab.width / 2, y: ab.y + ab.height / 2 });
  }
  await expect(panel).toBeVisible();
  // Link: our own app icon (local; nothing leaves the machine).
  const linkTab = panel.getByRole('tab', { name: 'Link' });
  const lb = (await linkTab.boundingBox())!;
  await person.click({ x: lb.x + lb.width / 2, y: lb.y + lb.height / 2 });
  await person.type('not a link');
  await person.press('Enter');
  await expect(panel.getByRole('alert')).toContainText('http');
  await page.locator('.lab-file-url').fill('');
  await person.type('http://localhost:3005/icons/icon-192.png');
  await person.press('Enter');
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.doc-body-v2 [data-content-type="image"] img').first()).toBeVisible();
  expect((await blocks(page)).find((b) => b.type === 'image')?.props.url).toBe('http://localhost:3005/icons/icon-192.png');

  // Upload: a second image block, its file chosen like a person would (the chooser).
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }, { type: 'image' }]);
  const add = page.locator('.doc-body-v2 [data-content-type="image"] .bn-add-file-button').first();
  const ab = (await add.boundingBox())!;
  await person.click({ x: ab.x + ab.width / 2, y: ab.y + ab.height / 2 });
  await expect(panel).toBeVisible();
  const choose = panel.getByRole('button', { name: 'Choose an image' });
  const cb = (await choose.boundingBox())!;
  const chooser = page.waitForEvent('filechooser');
  await person.click({ x: cb.x + cb.width / 2, y: cb.y + cb.height / 2 });
  // A small PNG drawn by the browser itself.
  const png = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 32;
      const g = c.getContext('2d')!;
      g.fillStyle = '#2383E2';
      g.fillRect(0, 0, 64, 32);
      return c.toDataURL('image/png').split(',')[1];
    }),
    'base64',
  );
  await (await chooser).setFiles({ name: 'two.png', mimeType: 'image/png', buffer: png });
  await expect(panel).toHaveCount(0, { timeout: 30_000 });
  const url = (await blocks(page)).find((b) => b.type === 'image')?.props.url as string;
  expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
});

test('Callout: "/callout", typed text, the icon changes its kind, kept after a reload', async ({ page, person, docId }) => {
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('/callout');
  await person.press('Enter');
  await person.type('Heaps give O(1) peek');
  const icon = (await page.locator('.doc-body-v2 .doc-callout-kind').first().boundingBox())!;
  await person.click({ x: icon.x + icon.width / 2, y: icon.y + icon.height / 2 });
  await page.getByRole('menuitem', { name: 'Tip' }).click();
  await person.pause(300);
  let c = (await blocks(page)).find((b) => b.type === 'callout');
  expect([c?.props.kind, c?.text]).toEqual(['tip', 'Heaps give O(1) peek']);
  await openV2(page, docId);
  c = (await blocks(page)).find((b) => b.type === 'callout');
  expect([c?.props.kind, c?.text]).toEqual(['tip', 'Heaps give O(1) peek']);
});

test('Code: "```ts " makes a TypeScript block coloured as it is typed; the picker changes the language; kept after a reload', async ({ page, person, docId }) => {
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('```ts ');
  await person.type('const size = 10;');
  const code = page.locator('.doc-body-v2 .lab-code').first();
  await expect(code.locator('.doc-code-lang')).toHaveText('TypeScript');
  const keyword = code.locator('.shiki', { hasText: 'const' }).first();
  await expect(keyword).toBeVisible({ timeout: 15_000 });
  const ink = await code.locator('.lab-code-source code').evaluate((el) => getComputedStyle(el).color);
  expect(await keyword.evaluate((el) => getComputedStyle(el).color), 'the keyword takes a colour, not ink').not.toBe(ink);
  // The language picker: search, Enter.
  const lang = (await code.locator('.doc-code-lang').boundingBox())!;
  await person.click({ x: lang.x + lang.width / 2, y: lang.y + lang.height / 2 });
  await expect(page.locator('.rc-picker-search')).toBeFocused();
  await person.type('go');
  await person.press('Enter');
  await expect(code.locator('.doc-code-lang')).toHaveText('Go');
  let c = (await blocks(page)).find((b) => b.type === 'codeBlock');
  expect([c?.props.language, c?.text]).toEqual(['go', 'const size = 10;']);
  await openV2(page, docId);
  c = (await blocks(page)).find((b) => b.type === 'codeBlock');
  expect([c?.props.language, c?.text]).toEqual(['go', 'const size = 10;']);
  await expect(page.locator('.doc-body-v2 .lab-code .doc-code-lang').first()).toHaveText('Go');
});

test('Headings: "/heading 4" makes an H4; a toggle heading starts open, Enter after its title goes inside, its triangle folds it', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('/heading 4');
  await person.press('Enter');
  await person.type('Per-tenant limits');
  let list = await blocks(page);
  expect(list.find((b) => b.text === 'Per-tenant limits')?.props.level).toBe(4);
  await person.press('Enter');
  await person.type('/toggle heading 2');
  await person.press('Enter');
  await person.type('Token bucket');
  await person.press('Enter');
  await person.type('Refill at a fixed rate');
  expect(await tree(page)).toContain('Token bucket[Refill at a fixed rate]');
  list = await blocks(page);
  const th = list.find((b) => b.text === 'Token bucket');
  expect([th?.type, th?.props.level, th?.props.isToggleable]).toEqual(['heading', 2, true]);
  // The triangle folds what is inside.
  const frame = page.locator('.doc-body-v2 .bn-toggle-frame').filter({ has: page.locator('[data-content-type="heading"]') }).first();
  const arrow = (await frame.locator('.bn-toggle-button').first().boundingBox())!;
  await person.click({ x: arrow.x + arrow.width / 2, y: arrow.y + arrow.height / 2 });
  await expect(page.locator('.doc-body-v2 .bn-inline-content', { hasText: 'Refill at a fixed rate' })).toBeHidden();
});

/** The table's shape from the editor: rows × columns, and whether its first row is a header. */
async function tableShape(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const editor = (window as unknown as { __labEditor: { document: { type: string; content: { rows: { cells: unknown[] }[]; headerRows?: number } }[] } }).__labEditor;
    const t = editor.document.find((b) => b.type === 'table');
    return t ? { rows: t.content.rows.length, cols: t.content.rows[0]?.cells.length ?? 0, header: Boolean(t.content.headerRows) } : null;
  });
}

test('Table: "/table" makes one; the row and column grips insert and delete; the "+" strip adds a row; a header row', async ({ page, person, docId }) => {
  expect(docId).toBeTruthy();
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  await person.type('/table');
  await expect(page.locator('.lab-slash')).toContainText('Table');
  await person.press('Enter');
  await expect(page.locator('.doc-body-v2 [data-content-type="table"] table')).toBeVisible();
  const start = (await tableShape(page))!;
  expect(start.rows).toBeGreaterThan(0);

  // Hover the first cell: its row grip (left) and column grip (top) show.
  const cell = page.locator('.doc-body-v2 [data-content-type="table"] td, .doc-body-v2 [data-content-type="table"] th').first();
  const cb = (await cell.boundingBox())!;
  await person.glide({ x: cb.x + cb.width / 2, y: cb.y + cb.height / 2 });
  await person.pause(400);
  const rowGrip = page.locator('.lab-table-handle--row');
  await expect(rowGrip).toBeVisible();
  await expect(page.locator('.lab-table-handle--column')).toBeVisible();

  // Row grip → Insert below.
  const rb = (await rowGrip.boundingBox())!;
  await person.click({ x: rb.x + rb.width / 2, y: rb.y + rb.height / 2 });
  await expect(page.locator('.lab-table-menu')).toBeVisible();
  const below = page.locator('.lab-table-menu').getByText('Insert below');
  const bb = (await below.boundingBox())!;
  await person.click({ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
  await expect.poll(async () => (await tableShape(page))!.rows).toBe(start.rows + 1);

  // Header row from the first row's grip.
  await person.glide({ x: cb.x + cb.width / 2, y: cb.y + cb.height / 2 });
  await person.pause(400);
  const rb2 = (await rowGrip.boundingBox())!;
  await person.click({ x: rb2.x + rb2.width / 2, y: rb2.y + rb2.height / 2 });
  const header = page.locator('.lab-table-menu').getByText('Header row');
  const hb = (await header.boundingBox())!;
  await person.click({ x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 });
  await expect.poll(async () => (await tableShape(page))!.header).toBe(true);

  // Column grip → Delete column.
  await person.glide({ x: cb.x + cb.width / 2, y: cb.y + cb.height / 2 + 2 });
  await person.pause(400);
  const colGrip = page.locator('.lab-table-handle--column');
  await expect(colGrip).toBeVisible();
  const kb = (await colGrip.boundingBox())!;
  await person.click({ x: kb.x + kb.width / 2, y: kb.y + kb.height / 2 });
  const del = page.locator('.lab-table-menu').getByText('Delete column');
  const db = (await del.boundingBox())!;
  await person.click({ x: db.x + db.width / 2, y: db.y + db.height / 2 });
  await expect.poll(async () => (await tableShape(page))!.cols).toBe(start.cols - 1);

  // The "+" strip under the table adds a row.
  const lastCell = page.locator('.doc-body-v2 [data-content-type="table"] td').last();
  const lb = (await lastCell.boundingBox())!;
  await person.glide({ x: lb.x + lb.width / 2, y: lb.y + lb.height / 2 });
  await person.pause(400);
  const strip = page.locator('.lab-table-extend--rows');
  await expect(strip).toBeVisible();
  const sb = (await strip.boundingBox())!;
  await person.glide({ x: sb.x + sb.width / 2, y: sb.y + sb.height / 2 });
  const before = (await tableShape(page))!.rows;
  await person.click({ x: sb.x + sb.width / 2, y: sb.y + sb.height / 2 });
  await expect.poll(async () => (await tableShape(page))!.rows).toBe(before + 1);
});

test('Paste: Markdown from a chat becomes our blocks (heading, list, callout, Mermaid diagram), after the caret', async ({ page, person, docId }) => {
  expect(docId).toBeTruthy();
  await seed(page, [{ type: 'paragraph', content: 'Anchor' }]);
  await clickEnd(person, 'Anchor');
  await person.press('Enter');
  // A person pauses before pasting (Yjs groups edits closer than half a second into one Undo step).
  await person.pause(800);
  const md = ['## Token bucket', '', '- refill at a fixed rate', '- burst up to the size', '', '> [!TIP]', '> Keep it in Redis.', '', '```mermaid', 'flowchart LR', '  A[Client] --> B[Gateway]', '```'].join('\n');
  // The clipboard as a chat's "Copy" leaves it: plain text only.
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.querySelector('.doc-body-v2 .bn-editor')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, md);
  await expect.poll(async () => (await blocks(page)).map((b) => b.type).join(','), { timeout: 15_000 }).toBe('paragraph,heading,bulletListItem,bulletListItem,callout,diagram');
  const list = await blocks(page);
  expect(list[1]!.text).toBe('Token bucket');
  expect(list.find((b) => b.type === 'diagram')!.text).toContain('A[Client] --> B[Gateway]');
  // Ctrl+Z takes the paste back in one step.
  await person.press('Control+z');
  await expect.poll(async () => (await blocks(page)).map((b) => b.type).join(','), { timeout: 10_000 }).toBe('paragraph,paragraph');
});
