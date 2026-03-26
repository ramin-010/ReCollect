/**
 * Recently Visited Service
 * Hybrid: localStorage for instant reads + server API for cross-device persistence
 */
import axiosInstance from '@/lib/utils/axios';

export interface RecentVisit {
  id: string;
  itemId: string;
  itemType: 'doc' | 'drawing' | 'slide' | 'workspace';
  title: string;
  route: string;
  visitedAt: number; // timestamp
}

const STORAGE_KEY = 'recollect_recent_visits';
const MAX_ITEMS = 20;

// ─── localStorage helpers ────────────────────────────────

function readCache(): RecentVisit[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeCache(visits: RecentVisit[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits.slice(0, MAX_ITEMS)));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ─── Public API ──────────────────────────────────────────

/**
 * Track a visit. Updates localStorage immediately, then POSTs to server (fire-and-forget).
 */
export function trackVisit(item: {
  itemId: string;
  itemType: 'doc' | 'drawing' | 'slide' | 'workspace';
  title: string;
  route: string;
}) {
  const now = Date.now();

  // 1. Update localStorage cache immediately
  const cache = readCache();
  const filtered = cache.filter((v) => v.itemId !== item.itemId);
  const newVisit: RecentVisit = {
    id: item.itemId, // use itemId as local id
    itemId: item.itemId,
    itemType: item.itemType,
    title: item.title || 'Untitled',
    route: item.route,
    visitedAt: now,
  };
  writeCache([newVisit, ...filtered]);

  // 2. POST to server (fire-and-forget, don't block UI)
  axiosInstance
    .post('/api/recent-visits', {
      itemId: item.itemId,
      itemType: item.itemType,
      title: item.title || 'Untitled',
      route: item.route,
    })
    .catch(() => {
      // Silently fail — localStorage has the data
    });
}

/**
 * Get recent visits. Returns localStorage cache first for instant rendering.
 * Optionally syncs from server in the background.
 */
export function getRecentVisitsFromCache(): RecentVisit[] {
  return readCache();
}

/**
 * Fetch from server and update localStorage cache. Returns the fresh data.
 */
export async function syncRecentVisits(): Promise<RecentVisit[]> {
  try {
    const res = await axiosInstance.get('/api/recent-visits');
    if (res.data.success && Array.isArray(res.data.data)) {
      const visits: RecentVisit[] = res.data.data.map((v: any) => ({
        id: v._id || v.itemId,
        itemId: v.itemId,
        itemType: v.itemType,
        title: v.title,
        route: v.route,
        visitedAt: new Date(v.visitedAt).getTime(),
      }));
      writeCache(visits);
      return visits;
    }
  } catch {
    // Server unavailable — fall back to cache
  }
  return readCache();
}

/**
 * Remove a visit (e.g. when an item is deleted).
 */
export function removeVisit(itemId: string) {
  // 1. Remove from cache
  const cache = readCache();
  writeCache(cache.filter((v) => v.itemId !== itemId));

  // 2. DELETE from server (fire-and-forget)
  axiosInstance.delete(`/api/recent-visits/${itemId}`).catch(() => {});
}
