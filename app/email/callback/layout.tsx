// app/email/callback/layout.tsx
import { requireFeature } from '@/lib/features';

// Gmail OAuth callback is hidden: the email backend was removed on pg-migration (see lib/features.ts).
export default function EmailCallbackLayout({ children }: { children: React.ReactNode }) {
  requireFeature('email');
  return <>{children}</>;
}
