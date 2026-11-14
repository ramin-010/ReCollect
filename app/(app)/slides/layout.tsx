// app/(app)/slides/layout.tsx
import { requireFeature } from '@/lib/features';

// Presentations are hidden: the slides backend was removed on pg-migration (see lib/features.ts).
export default function SlidesLayout({ children }: { children: React.ReactNode }) {
  requireFeature('slides');
  return <>{children}</>;
}
