import { Suspense } from 'react';
import { DocsLibrary } from '@/components/docs/library/DocsLibrary';

export default function DocsPage() {
  return (
    <Suspense>
      <DocsLibrary />
    </Suspense>
  );
}
