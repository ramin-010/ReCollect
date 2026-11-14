'use client';

import { useEffect, useRef } from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/lib/store/learningStore';
import { todayIn } from '@/lib/learning/dates';
import { RcButton, rcScope } from '@/components/rc-ui';
import { HomeSkeleton, pageFrame, TodayHome } from './home/TodayHome';

const HIDDEN_REFETCH_MS = 60_000;

/** Refetch on return after > 60 s hidden (replaces Revise's Pusher) and when the user's day changes. */
function useLearningLifecycle() {
  const hiddenAt = useRef<number | null>(null);
  useEffect(() => {
    const store = useLearningStore.getState();
    store.setHomeMounted(true);
    void store.load();

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
      } else if (hiddenAt.current !== null && Date.now() - hiddenAt.current > HIDDEN_REFETCH_MS) {
        hiddenAt.current = null;
        void useLearningStore.getState().refresh();
      }
    };
    const midnight = setInterval(() => {
      const d = useLearningStore.getState().data;
      if (d && todayIn(d.timezone) !== d.today) void useLearningStore.getState().refresh();
    }, 60_000);

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(midnight);
      useLearningStore.getState().setHomeMounted(false);
    };
  }, []);
}

/**
 * `/` when features.learningHome: Home / Today (loop v2; components/learning/home). The previous
 * Revise-style arrangement's parts stay in this folder; the routine ones render only while
 * routineEnabled (home/RoutinePanel).
 */
export function LearningHome() {
  useLearningLifecycle();
  const data = useLearningStore((s) => s.data);
  const status = useLearningStore((s) => s.status);

  if (data) return <TodayHome data={data} />;
  if (status === 'error') {
    return (
      <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)]')}>
        <div className={pageFrame}>
          <div role="alert" className="rc-card mx-auto mt-10 max-w-[480px] px-5 py-5">
            <p className="rc-title">Couldn’t load your day.</p>
            <p className="mt-1 text-[15px] rc-ink-2">The server didn’t answer. Check that you’re online, then try again.</p>
            <RcButton variant="main" className="mt-4" icon={<RotateCw />} onClick={() => void useLearningStore.getState().load()}>
              Try again
            </RcButton>
          </div>
        </div>
      </div>
    );
  }
  return <HomeSkeleton />;
}
