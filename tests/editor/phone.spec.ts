/** The block handle on a phone (PhoneBlockBar): a touch screen gets a bar above the keyboard instead of the grip. */
import { devices } from '@playwright/test';
import { test, expect, seed, blocks } from './support';

test.use({ ...devices['Pixel 7'], viewport: { width: 390, height: 780 } });

test('Phone: a tap into a block shows the bar; Move up, Turn into, Indent and Outdent act on that block', async ({ page, docId }) => {
  void docId;
  await seed(page, [
    { type: 'paragraph', content: 'First' },
    { type: 'paragraph', content: 'Second' },
    { type: 'bulletListItem', content: 'List one' },
    { type: 'bulletListItem', content: 'List two' },
  ]);
  const tapText = async (text: string) => {
    await page.locator('.doc-body-v2 .bn-inline-content', { hasText: text }).first().tap();
    await page.waitForTimeout(400);
  };
  const tapBar = async (label: string) => {
    await page.locator(`.phone-block-bar [aria-label^="${label}"]`).tap();
    await page.waitForTimeout(400);
  };
  await expect(page.locator('.phone-block-bar')).toHaveCount(0);
  await tapText('Second');
  await expect(page.locator('.phone-block-bar')).toBeVisible();
  await expect(page.locator('.phone-tabs')).toBeHidden();
  await expect(page.locator('.phone-block-bar .phone-block-kind')).toHaveText('Text');

  await tapBar('Move up');
  expect((await blocks(page)).map((b) => b.text).slice(0, 2)).toEqual(['Second', 'First']);

  await tapBar('Turn into');
  await page.locator('.phone-block-sheet').getByRole('menuitemradio', { name: 'Heading 2', exact: true }).tap();
  await page.waitForTimeout(400);
  const second = (await blocks(page)).find((b) => b.text === 'Second');
  expect([second?.type, second?.props.level]).toEqual(['heading', 2]);

  await tapText('List two');
  await tapBar('Indent');
  expect((await blocks(page)).find((b) => b.text === 'List two')?.depth).toBe(1);
  await tapBar('Outdent');
  expect((await blocks(page)).find((b) => b.text === 'List two')?.depth).toBe(0);
});
