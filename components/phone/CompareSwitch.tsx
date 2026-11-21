'use client';

/**
 * QA only: "Compare with design" inside the phone world (PHONE_APP_REDESIGN_PLAN §7, the owner's final review). On a
 * phone a small switch flips between this screen and the approved mock-up of it, full size, in the same look; on a
 * wide screen it opens the side-by-side view (/qa/compare). Never in production (qaEnabled).
 */
import { useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { designScreenOf, designUrl, qaEnabled } from '@/lib/qa';

const noSubscribe = () => () => undefined;

export function CompareSwitch({ theme, mode }: { theme: string; mode: 'light' | 'dark' }) {
  const pathname = usePathname() ?? '/m/today';
  const router = useRouter();
  const [design, setDesign] = useState(false);
  // Not inside the side-by-side view itself (the app there sits in a frame); read after hydration, so no mismatch.
  const inFrame = useSyncExternalStore(noSubscribe, () => window.self !== window.top, () => false);
  if (!qaEnabled() || inFrame) return null;
  const screen = designScreenOf(pathname);

  const flip = () => {
    if (window.innerWidth > 700) {
      router.push(`/qa/compare?screen=${screen}`);
      return;
    }
    setDesign((d) => !d);
  };

  return (
    <>
      {design ? <iframe className="pw-design" title="The approved design" src={designUrl(screen, theme, mode)} /> : null}
      <button type="button" className={`pw-compare${design ? ' is-on' : ''}`} onClick={flip} aria-pressed={design} aria-label={design ? 'Show the app' : 'Compare with design'}>
        {design ? 'App' : 'Design'}
      </button>
    </>
  );
}
