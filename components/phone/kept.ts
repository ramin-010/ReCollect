'use client';

/**
 * What the phone screens last showed, kept in memory for this visit and this account (never stored on the device):
 * a screen you come back to opens with it at once while it reads the fresh data, so moving around never flashes a
 * skeleton or jumps when the data lands. The first visit to a screen reads as before. The page's first load starts
 * empty on both sides (nothing is kept on the server), so hydration always matches.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

const kept = new Map<string, unknown>();
const scoped = (key: string): string => `${useAuthStore.getState().user?._id ?? '-'}:${key}`;

/** useState that starts from what this screen last showed, and keeps each change for the next visit. */
export function useKept<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const k = scoped(key);
    return kept.has(k) ? (kept.get(k) as T) : initial;
  });
  useEffect(() => {
    kept.set(scoped(key), value);
  }, [key, value]);
  return [value, setValue];
}
