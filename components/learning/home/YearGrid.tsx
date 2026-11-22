'use client';

import { useEffect, useState } from 'react';
import { learningApi } from '@/lib/api/learningApi';
import { SESSIONS_CHANGED_EVENT } from '@/lib/learning/sessionLog';
import type { StandData } from '@/lib/learning/types';
import { shortDay } from './format';


/**
 * The year for Home's header (the owner, 11-22: the GitHub-type consistency graph as the page's
 * header, at the very top): Where you stand's numbers, loaded now and again when today's activity
 * changes (`activityKey`), a session is logged, or the window gets focus. `null` while loading,
 * 'failed' when the call failed (the header then keeps the week's rhythm and Home works on).
 */
export function useYearStand(activityKey: string): StandData | null | 'failed' {
  const [stand, setStand] = useState<StandData | null | 'failed'>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    window.addEventListener(SESSIONS_CHANGED_EVENT, again);
    window.addEventListener('focus', again);
    return () => {
      window.removeEventListener(SESSIONS_CHANGED_EVENT, again);
      window.removeEventListener('focus', again);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    learningApi.getStand().then(
      (s) => alive && setStand(s),
      () => alive && setStand((v) => (v && v !== 'failed' ? v : 'failed'))
    );
    return () => {
      alive = false;
    };
  }, [activityKey, tick]);

  return stand;
}

/** The header's figure: '33 active days since 23 Aug', or '… in the last year' once the record covers it. */
export function yearWords(stand: StandData): string {
  const year = stand.periods.year;
  const n = year.current.activeDays;
  return `${n} active ${n === 1 ? 'day' : 'days'} ${year.partial ? `since ${shortDay(stand.recordStart, stand.today)}` : 'in the last year'}`;
}
