'use client';

import { useParams } from 'next/navigation';
import { DocPage } from '@/components/docs/page/DocPage';

export default function DocRoute() {
  const params = useParams<{ id: string }>();
  return <DocPage key={params.id} id={params.id} />;
}
