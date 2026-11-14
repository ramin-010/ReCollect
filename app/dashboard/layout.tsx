// app/dashboard/layout.tsx
import { requireFeature } from '@/lib/features';

// Public legacy-dashboard pages (/dashboard/[slug]) are hidden: the dashboards backend was removed on pg-migration (see lib/features.ts).
export default function SharedDashboardLayout({ children }: { children: React.ReactNode }) {
  requireFeature('dashboards');
  return <>{children}</>;
}
