import type { ReactNode } from 'react';
import { create } from 'zustand';

/** One step of the top bar's breadcrumb (Notion's pattern: "Docs / DSA / Two pointers"). */
export interface Crumb {
  label: string;
  href?: string;
}

interface TopBarState {
  /** When set, the top bar shows these instead of the route's own title. */
  crumbs: Crumb[] | null;
  /** Page actions at the right of the top bar (presence, Share, the page menu). */
  actions: ReactNode | null;
  /** A page that draws its own header at the very top (Home's header options, the owner 11-22): the bar is hidden from 1280 up. */
  hiddenOnDesktop: boolean;
  setTopBar: (s: { crumbs?: Crumb[] | null; actions?: ReactNode | null; hiddenOnDesktop?: boolean }) => void;
  clearTopBar: () => void;
}

/** A page fills the top bar while it is mounted and clears it on unmount. */
export const useTopBar = create<TopBarState>((set) => ({
  crumbs: null,
  actions: null,
  hiddenOnDesktop: false,
  setTopBar: (s) => set(s),
  clearTopBar: () => set({ crumbs: null, actions: null, hiddenOnDesktop: false }),
}));
