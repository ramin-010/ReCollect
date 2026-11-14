// app/print/slides/layout.tsx
import { requireFeature } from '@/lib/features';

// Deck print/export pages are hidden: the slides backend was removed on pg-migration (see lib/features.ts).
export default function PrintSlidesLayout({ children }: { children: React.ReactNode }) {
  requireFeature('slides');
  return <>{children}</>;
}
