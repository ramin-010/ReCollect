/** Logs in once as the QA user and keeps the session for every test (never the owner's account). */
import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const QA = { email: 'qa@recollect.local', password: 'qapass123' };

export default async function globalSetup(config: FullConfig) {
  const project = config.projects[0];
  const { baseURL, storageState, launchOptions } = project.use;
  const file = String(storageState);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`, { timeout: 120_000 });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Continue with email' }).click({ timeout: 3000 }).catch(() => {});
  await page.locator('input[type="email"], input[name="email"]').first().fill(QA.email);
  await page.locator('input[type="password"]').first().fill(QA.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 60_000 });
  await page.evaluate(() => localStorage.setItem('theme', 'light'));
  await page.context().storageState({ path: file });
  await browser.close();
}
