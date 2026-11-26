'use client';

import { Suspense } from 'react';
import { ConsentPage } from '@/components/oauth/ConsentPage';

/** /oauth/consent?request=…: an app (claude.ai's connector, Claude Code) asks to use Kaaga (ALWAYS_ON_SPEC 6.5). */
export default function OAuthConsentRoute() {
  return (
    <Suspense>
      <ConsentPage />
    </Suspense>
  );
}
