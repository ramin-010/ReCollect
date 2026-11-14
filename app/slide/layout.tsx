// app/slide/layout.tsx
import { requireFeature } from '@/lib/features';

// Public deck share pages (/slide/[slug]) are hidden: the slides backend was removed on pg-migration (see lib/features.ts).
export default function SharedSlideLayout({ children }: { children: React.ReactNode }) {
  requireFeature('slides');
  return <>{children}</>;
}
