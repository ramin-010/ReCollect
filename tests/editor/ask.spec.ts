/**
 * Ask AI inside a doc (DOCS_EDITOR_V2_PLAN phase 5), on the fake model: no AI is called. Runs only with
 * ASK_AI_FAKE=1, against a backend started with ASSISTANT_FAKE=qa@recollect.local (the fake picks real
 * block tools by keywords, so the edit log, the live doc and Undo all run for real). Skipped otherwise.
 */
import { test, expect, seed, blocks, clickEnd, row } from './support';

test.skip(!process.env.ASK_AI_FAKE, 'needs ASK_AI_FAKE=1 and the backend started with ASSISTANT_FAKE=qa@recollect.local');

const PARA = 'Each request takes a token from the bucket, and tokens come back at a fixed rate.';

test('Ask AI: select → the format bar → Make shorter → Undo; /ai on an empty line → Continue writing → Keep', async ({ page, person, docId }) => {
  void docId;
  await seed(page, [{ type: 'heading', props: { level: 2 }, content: 'Token bucket' }, { type: 'paragraph', content: PARA }, { type: 'paragraph' }]);

  // Select the words with a slow drag; the format bar offers Ask AI first.
  const r = await row(page, PARA);
  await person.glide({ x: r.textLeft + 2, y: r.y + r.h / 2 });
  await page.mouse.down();
  await person.glide({ x: r.textRight - 2, y: r.y + r.h / 2 }, 24);
  await page.mouse.up();
  await person.pause(400);
  const ask = page.locator('.lab-bar').getByRole('button', { name: 'Ask AI' });
  await expect(ask).toBeVisible();
  const ab = (await ask.boundingBox())!;
  await person.click({ x: ab.x + ab.width / 2, y: ab.y + ab.height / 2 });
  const box = page.locator('.doc-ask');
  await expect(box).toBeVisible();
  await expect(page.locator('.doc-ask-input')).toBeFocused();

  // Make shorter: the block changes live; the box says so; Undo puts the words back.
  const shorter = page.locator('.doc-ask-menu .lab-menu-item', { hasText: 'Make shorter' });
  const sb = (await shorter.boundingBox())!;
  await person.click({ x: sb.x + sb.width / 2, y: sb.y + sb.height / 2 });
  await expect(page.locator('.doc-ask[data-phase="done"]')).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await blocks(page))[1]!.text.length).toBeLessThan(PARA.length);
  await expect(page.locator('.doc-ask-cost')).toContainText('1 change');
  const undo = page.locator('.doc-ask-actions button', { hasText: 'Undo' });
  const ub = (await undo.boundingBox())!;
  await person.click({ x: ub.x + ub.width / 2, y: ub.y + ub.height / 2 });
  await expect.poll(async () => (await blocks(page))[1]!.text, { timeout: 15_000 }).toBe(PARA);
  await expect(page.locator('.doc-ask-input')).toHaveValue('Make shorter');
  await person.press('Escape');
  await expect(box).toHaveCount(0);

  // /ai on the empty line: Continue writing lands where the cursor was; Keep closes the box.
  await clickEnd(person, PARA);
  await person.press('ArrowDown');
  await person.type('/ai');
  await expect(page.locator('.lab-slash [data-selected]')).toContainText('Ask AI');
  await person.press('Enter');
  await expect(page.locator('.doc-ask-menu [data-selected]')).toContainText('Continue writing');
  await person.press('Enter');
  await expect(page.locator('.doc-ask[data-phase="done"]')).toBeVisible({ timeout: 30_000 });
  const after = await blocks(page);
  expect(after.length, 'the section came in before the empty line').toBeGreaterThanOrEqual(6);
  expect(after[2]!.type).toBe('heading');
  expect(after[after.length - 1]!.text).toBe('');
  const keep = page.locator('.doc-ask-actions button', { hasText: 'Keep' });
  const kb = (await keep.boundingBox())!;
  await person.click({ x: kb.x + kb.width / 2, y: kb.y + kb.height / 2 });
  await expect(box).toHaveCount(0);
  await expect(page.locator('.doc-body-v2 .bn-editor')).toBeFocused();
});
