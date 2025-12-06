// lib/store/dashboardStore.ts
import { create } from 'zustand';
import { Dashboard, Content } from '../utils/types';

interface DashboardState {
  dashboards: Dashboard[];
  currentDashboard: Dashboard | null;
  // Cache contents by dashboard ID
  dashboardContents: Map<string, Content[]>;
  loadingContents: Map<string, boolean>;
  
  setDashboards: (dashboards: Dashboard[]) => void;
  setCurrentDashboard: (dashboard: Dashboard | null) => void;
  addDashboard: (dashboard: Dashboard) => void;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  removeDashboard: (id: string) => void;
  
  // Content management
  setDashboardContents: (dashId: string, contents: Content[]) => void;
  getDashboardContents: (dashId: string) => Content[] | undefined;
  setLoadingContents: (dashId: string, loading: boolean) => void;
  isLoadingContents: (dashId: string) => boolean;
  
  addContent: (dashId: string, content: Content) => void;
  updateContent: (dashId: string, contentId: string, updates: Partial<Content>) => void;
  removeContent: (dashId: string, contentId: string) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  currentDashboard: null,
  dashboardContents: new Map(),
  loadingContents: new Map(),
  
  setDashboards: (dashboards) => set({ dashboards }),
  
  setCurrentDashboard: (dashboard) => set({ currentDashboard: dashboard }),
  
  addDashboard: (dashboard) => set((state) => ({
    dashboards: [dashboard, ...state.dashboards]
  })),
  
  updateDashboard: (id, updates) => set((state) => ({
    dashboards: state.dashboards.map(dash => 
      dash._id === id ? { ...dash, ...updates } : dash
    ),
    currentDashboard: state.currentDashboard?._id === id 
      ? { ...state.currentDashboard, ...updates }
      : state.currentDashboard
  })),
  
  removeDashboard: (id) => set((state) => {
    const newContents = new Map(state.dashboardContents);
    const newLoading = new Map(state.loadingContents);
    newContents.delete(id);
    newLoading.delete(id);
    
    return {
      dashboards: state.dashboards.filter(dash => dash._id !== id),
      currentDashboard: state.currentDashboard?._id === id ? null : state.currentDashboard,
      dashboardContents: newContents,
      loadingContents: newLoading
    };
  }),
  
  // Content cache management
  setDashboardContents: (dashId, contents) => set((state) => {
    const newContents = new Map(state.dashboardContents);
    newContents.set(dashId, contents);
    return { dashboardContents: newContents };
  }),
  
  getDashboardContents: (dashId) => {
    return get().dashboardContents.get(dashId);
  },
  
  setLoadingContents: (dashId, loading) => set((state) => {
    const newLoading = new Map(state.loadingContents);
    newLoading.set(dashId, loading);
    return { loadingContents: newLoading };
  }),
  
  isLoadingContents: (dashId) => {
    return get().loadingContents.get(dashId) || false;
  },
  
  addContent: (dashId, content) => set((state) => {
    const currentContents = state.dashboardContents.get(dashId) || [];
    const newContents = new Map(state.dashboardContents);
    newContents.set(dashId, [content, ...currentContents]);
    
    return {
      dashboardContents: newContents,
      currentDashboard: state.currentDashboard?._id === dashId
        ? { ...state.currentDashboard, contents: [content, ...(state.currentDashboard.contents || [])] }
        : state.currentDashboard
    };
  }),
  
  updateContent: (dashId, contentId, updates) => set((state) => {
    const currentContents = state.dashboardContents.get(dashId);
    if (!currentContents) return state;
    
    const updatedContents = currentContents.map(content =>
      content._id === contentId ? { ...content, ...updates } : content
    );
    
    const newContents = new Map(state.dashboardContents);
    newContents.set(dashId, updatedContents);
    
    return {
      dashboardContents: newContents,
      currentDashboard: state.currentDashboard?._id === dashId
        ? {
            ...state.currentDashboard,
            contents: state.currentDashboard.contents?.map(content =>
              content._id === contentId ? { ...content, ...updates } : content
            )
          }
        : state.currentDashboard
    };
  }),
  
  removeContent: (dashId, contentId) => set((state) => {
    const currentContents = state.dashboardContents.get(dashId);
    if (!currentContents) return state;
    
    const filteredContents = currentContents.filter(c => c._id !== contentId);
    const newContents = new Map(state.dashboardContents);
    newContents.set(dashId, filteredContents);
    
    return {
      dashboardContents: newContents,
      currentDashboard: state.currentDashboard?._id === dashId
        ? { ...state.currentDashboard, contents: state.currentDashboard.contents?.filter(c => c._id !== contentId) }
        : state.currentDashboard
    };
  }),
}));