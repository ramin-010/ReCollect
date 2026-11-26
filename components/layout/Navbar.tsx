// components/layout/Navbar.tsx
'use client';

import { useViewStore } from '@/lib/store/viewStore';
import { usePathname } from 'next/navigation';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { useCreateNote } from '@/lib/context/CreateNoteContext';
import { Button } from '@/components/ui-base/Button';
import { Share2, Plus, X, Home, FileText, Users, CheckSquare, Settings, Files, Mail, LayoutGrid, ChartNoAxesColumn, UserRound } from 'lucide-react';
import { useState } from 'react';
import { ShareDashboardDialog } from '@/components/dashboard/ShareDashboardDialog';
import { CoverPicker } from '@/components/docs/doc_editor/CoverPicker';
import { features } from '@/lib/features';
import Link from 'next/link';
import { useTopBar } from '@/lib/store/topBarStore';
import { FadeText } from '@/components/rc-ui/FadeText';
import { KaagaIcon } from '@/components/brand/kaaga';

/** The breadcrumb's page icon (Notion shows the page's own icon, never the brand mark). */
function PageIcon({ pathname }: { pathname: string }) {
  const cls = 'h-4 w-4 shrink-0 text-[var(--ui-icon)]';
  if (pathname === '/') return <Home className={cls} strokeWidth={1.75} />;
  if (pathname.startsWith('/docs')) return <FileText className={cls} strokeWidth={1.75} />;
  if (pathname.startsWith('/workspace')) return <Users className={cls} strokeWidth={1.75} />;
  if (pathname.startsWith('/todo')) return <CheckSquare className={cls} strokeWidth={1.75} />;
  if (pathname.startsWith('/settings')) return <Settings className={cls} strokeWidth={1.75} />;
  if (pathname.startsWith('/mirror')) return <ChartNoAxesColumn className={cls} strokeWidth={1.75} />;
  if (pathname.startsWith('/you')) return <UserRound className={cls} strokeWidth={1.75} />;
  if (pathname.startsWith('/ask')) return <KaagaIcon className={cls} />;
  if (pathname.startsWith('/slides')) return <Files className={cls} strokeWidth={1.75} />;
  if (pathname.startsWith('/email')) return <Mail className={cls} strokeWidth={1.75} />;
  return <LayoutGrid className={cls} strokeWidth={1.75} />;
}

export function Navbar() {
  const pathname = usePathname();
  const storedDashboard = useDashboardStore((state) => state.currentDashboard);
  // Legacy dashboards are hidden (lib/features.ts): no dashboard title, Share (create-dash-link) or "Note" button.
  const currentDashboard = features.dashboards ? storedDashboard : null;
  const { triggerCreateNote } = useCreateNote();
  
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  // Determine title based on current pathname
  const getTitle = () => {
    if (pathname === '/') return 'Home';
    if (pathname.startsWith('/docs')) return 'Docs';
    if (pathname.startsWith('/mirror')) return 'Where you stand';
    if (pathname.startsWith('/you')) return 'About you';
    if (pathname.startsWith('/ask')) return 'Ask Kaaga';
    if (pathname.startsWith('/share')) return 'Save to Kaaga';
    if (pathname.startsWith('/lab')) return 'Lab';
    if (pathname.startsWith('/workspace')) return 'Workspace';
    if (pathname.startsWith('/todo')) return 'Tasks';
    if (features.slides && pathname.startsWith('/slides')) return 'Presentations';
    if (pathname.startsWith('/settings')) return 'Settings';
    if (features.email && pathname.startsWith('/email')) return 'Email';
    
    if (currentDashboard) return currentDashboard.name;
    return 'Overview';
  };

  const title = getTitle();
  const crumbs = useTopBar((st) => st.crumbs);
  const pageActions = useTopBar((st) => st.actions);

  return (
    <>
      {/* Top bar (theme v2): a slim breadcrumb in the page colour, no band, no border (Notion's pattern) */}
      <nav className="sticky top-0 w-full bg-[hsl(var(--background))]">
        <div className="flex h-[44px] items-center pl-[60px] pr-3 lg:px-3 gap-2 relative z-10">
          {crumbs?.length ? (
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-0.5">
              <PageIcon pathname={pathname} />
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <span key={`${c.label}-${i}`} className={`flex items-center gap-0.5 ${last ? 'min-w-0' : 'shrink-0'}`}>
                    {i > 0 && <span aria-hidden className="px-0.5 text-[14px] text-[var(--ui-ink-3)]">/</span>}
                    {c.href && !last ? (
                      <Link href={c.href} className="flex h-[28px] items-center rounded-[6px] px-1.5 text-[14px] text-[var(--ui-ink-2)] transition-colors duration-100 hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]">
                        {c.label}
                      </Link>
                    ) : (
                      <h2 aria-current={last ? 'page' : undefined} className="min-w-0 max-w-[48ch] px-1.5 text-[14px] font-[400] leading-[28px] text-[var(--ui-ink-1)]">
                        <FadeText title={c.label}>{c.label}</FadeText>
                      </h2>
                    )}
                  </span>
                );
              })}
            </nav>
          ) : (
            <div className="flex min-w-0 items-center gap-1.5 h-[28px] px-1.5 rounded-[6px]">
              <PageIcon pathname={pathname} />
              <h2 className="truncate text-[14px] font-[400] leading-none text-[var(--ui-ink-1)]">{title}</h2>
            </div>
          )}

          <div className="flex-1" /> {/* Spacer */}

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {pageActions}
            {/* 
            {!coverImage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCoverPicker(true)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                title="Add Cover"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
            )}
            */}

            {currentDashboard && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsShareOpen(true)}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <div className="hidden sm:block mx-1 h-4 w-px bg-[hsl(var(--border))]"></div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentDashboard && triggerCreateNote(currentDashboard._id)}
                  className="mr-1 h-8"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span>Note</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Cover Image Header */}
      {coverImage && (
        <div className="w-full h-[20vh] relative group shrink-0">
          <img 
            src={coverImage} 
            alt="Page cover" 
            className="w-full h-full object-cover object-[0_50%]"
          />
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCoverPicker(true)}
              className="bg-black/50 hover:bg-black/70 text-white text-xs backdrop-blur-sm"
            >
              Change cover
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCoverImage(null)}
              className="bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cover Picker Modal */}
      <CoverPicker
        show={showCoverPicker}
        onClose={() => setShowCoverPicker(false)}
        currentCover={coverImage}
        onSelect={(url) => {
          setCoverImage(url);
          setShowCoverPicker(false);
        }}
      />

      {currentDashboard && (
        <ShareDashboardDialog
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          dashboard={currentDashboard}
        />
      )}
    </>
  );
}