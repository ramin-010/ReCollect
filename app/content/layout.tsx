// app/content/layout.tsx
import { requireFeature } from '@/lib/features';

// Public legacy-note pages (/content/[slug]) are hidden: the content backend was removed on pg-migration (see lib/features.ts).
export default function SharedContentLayout({ children }: { children: React.ReactNode }) {
  requireFeature('content');
  return <>{children}</>;
}
