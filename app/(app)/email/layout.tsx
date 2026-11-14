// app/(app)/email/layout.tsx
import { requireFeature } from '@/lib/features';

// Email/Gmail is hidden: its backend was removed on pg-migration (see lib/features.ts).
export default function EmailLayout({ children }: { children: React.ReactNode }) {
  requireFeature('email');
  return <>{children}</>;
}
