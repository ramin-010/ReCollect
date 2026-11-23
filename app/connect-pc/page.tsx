'use client';

import { Suspense } from 'react';
import { ConnectPcPage } from '@/components/setup/ConnectPcPage';

/** /connect-pc?code=…: a computer asks to use Recollect (`npx recollect-setup`, EASY_SETUP_PLAN §3.2). */
export default function ConnectPcRoute() {
  return (
    <Suspense>
      <ConnectPcPage />
    </Suspense>
  );
}
