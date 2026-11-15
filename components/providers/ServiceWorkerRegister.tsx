'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/push';

/** Registers /sw.js once per load (installable app, offline page, the morning notification). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
