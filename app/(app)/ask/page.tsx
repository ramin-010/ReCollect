import { Suspense } from 'react';
import { AskPage } from '@/components/assistant/AskPage';

export default function Ask() {
  return (
    <Suspense>
      <AskPage />
    </Suspense>
  );
}
