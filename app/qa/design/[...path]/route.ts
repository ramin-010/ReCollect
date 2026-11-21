// QA only: the approved phone mock-up (mockups/phone-app/, beside the app, never deployed) served from the web app's
// own address, so "Compare with design" can show it next to the real screen (PHONE_APP_REDESIGN_PLAN §7). A 404 in
// production, and for anything outside the mock-up's folder.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { qaEnabled } from '@/lib/qa';

export const dynamic = 'force-dynamic';

const ROOT = path.resolve(process.cwd(), '..', 'mockups', 'phone-app');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const notFound = () => new Response('Not found', { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  if (!qaEnabled()) return notFound();
  const parts = (await params).path ?? ['index.html'];
  const file = path.resolve(ROOT, ...parts);
  if (!file.startsWith(ROOT + path.sep)) return notFound();
  try {
    const body = await fs.readFile(file);
    return new Response(new Uint8Array(body), { headers: { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' } });
  } catch {
    return notFound();
  }
}
