'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { PublicDocPage } from '@/components/docs/public/PublicDocPage';

/** /p/<slug>: a doc published to the web (anyone with the link reads it; MANAGER_AND_DOCS_PLAN §2). */
export default function PublishedDocRoute() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  return (
    <Suspense>
      <PublicDocPage slug={slug} />
    </Suspense>
  );
}
