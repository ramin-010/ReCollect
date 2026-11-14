// lib/features.ts
/**
 * Feature flags for modules that are hidden in the app.
 *
 * The module flags below are OFF because the backend modules behind these features were
 * removed on the `pg-migration` branch (the move to Postgres), so their API
 * endpoints now return 404. Their frontend code is only hidden, not deleted:
 * nav entries, buttons and data fetches check these flags, and each cut route
 * calls `requireFeature()` in its layout so it renders the 404 page.
 * Only turn a flag back on together with its backend module.
 */
import { notFound } from 'next/navigation';

export interface FeatureFlags {
  /** Gmail connection + AI email drafts: /email, /email/callback */
  email: boolean;
  /** Presentations (slide decks): /slides, /slide/[slug], /print/slides/[deckId], presenter */
  slides: boolean;
  /** Legacy canvas notes ("content") + canvas blocks: /content/[slug], Archived/Favorites in Settings */
  content: boolean;
  /** Legacy dashboards (groups of notes): /dashboard/[slug], the default dashboard made at sign-up */
  dashboards: boolean;
  /** Expense tracker (components/expenses; it has no route or nav entry) */
  expenses: boolean;
  /** LiveKit live presenting rooms: /live/[roomId] */
  liveRooms: boolean;
  /**
   * Home `/` = the learning dashboard (Revise's layout: revisions, schedule, tasks, quick notes;
   * LEARNING_SPEC). ON by default; when OFF, `/` renders the previous HomeView.
   */
  learningHome: boolean;
}

export type FeatureName = keyof FeatureFlags;

export const features: Readonly<FeatureFlags> = Object.freeze({
  email: false,
  slides: false,
  content: false,
  dashboards: false,
  expenses: false,
  liveRooms: false,
  learningHome: true,
});

/** Route guard for a cut feature's (server component) layout: renders the 404 page when the feature is off. */
export function requireFeature(name: FeatureName): void {
  if (!features[name]) notFound();
}

/**
 * Task references point at docs (kept), slides or legacy content (both hidden).
 * Use this for display and search filtering only; never to rewrite a task's stored references.
 */
export function isReferenceTypeVisible(type: string): boolean {
  if (type === 'slide') return features.slides;
  if (type === 'content') return features.content;
  return true;
}
