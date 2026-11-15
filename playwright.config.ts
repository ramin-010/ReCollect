/**
 * The editor's acceptance tests (DOCS_EDITOR_V2_PLAN §7): one test per NB- item of
 * context/research/notion-editor-behaviour.md, driven like a person (the pointer glides, drags are
 * slow, keys have pauses), on the QA account (qa@recollect.local; never Ramin's).
 *
 * Needs the app running locally (backend :8002, live editing :1234, frontend :3005):
 * `npm run test:editor`. The browser: CHROME_EXE, else the newest Chromium Playwright has
 * already downloaded on this machine, else Playwright's own (`npx playwright install chromium`).
 */
import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function localChromium(): string | undefined {
  if (process.env.CHROME_EXE) return process.env.CHROME_EXE;
  const root = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'ms-playwright') : '';
  if (!root || !fs.existsSync(root)) return undefined;
  const builds = fs
    .readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const b of builds) {
    const exe = path.join(root, b, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

export default defineConfig({
  testDir: './tests/editor',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './tests/editor/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3005',
    storageState: path.join(__dirname, 'tests', 'editor', '.auth', 'qa.json'),
    viewport: { width: 1536, height: 730 },
    deviceScaleFactor: 1.25,
    colorScheme: 'light',
    launchOptions: { executablePath: localChromium() },
    trace: 'retain-on-failure',
  },
});
