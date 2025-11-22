// lib/store/dashboardStore.ts
import { create } from 'zustand';
import { Dashboard, Content } from '../utils/types';

interface DashboardState {
  dashboards: Dashboard[];
  currentDashboard: Dashboard | null;
  setDashboards: (dashboards: Dashboard[]) => void;
  setCurrentDashboard: (dashboard: Dashboard | null) => void;
  addDashboard: (dashboard: Dashboard) => void;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  removeDashboard: (id: string) => void;
  addContent: (dashId: string, content: Content) => void;
  updateContent: (dashId: string, contentId: string, updates: Partial<Content>) => void;
  removeContent: (dashId: string, contentId: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dashboards: [],
  currentDashboard: null,
  
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
  
  removeDashboard: (id) => set((state) => ({
    dashboards: state.dashboards.filter(dash => dash._id !== id),
    currentDashboard: state.currentDashboard?._id === id ? null : state.currentDashboard
  })),
  
  addContent: (dashId, content) => set((state) => ({
    dashboards: state.dashboards.map(dash => 
      dash._id === dashId 
        ? { ...dash, contents: [content, ...dash.contents] }
        : dash
    ),
    currentDashboard: state.currentDashboard?._id === dashId
      ? { ...state.currentDashboard, contents: [content, ...state.currentDashboard.contents] }
      : state.currentDashboard
  })),
  
  updateContent: (dashId, contentId, updates) => set((state) => ({
    dashboards: state.dashboards.map(dash =>
      dash._id === dashId
        ? {
            ...dash,
            contents: dash.contents.map(content =>
              content._id === contentId ? { ...content, ...updates } : content
            )
          }
        : dash
    ),
    currentDashboard: state.currentDashboard?._id === dashId
      ? {
          ...state.currentDashboard,
          contents: state.currentDashboard.contents.map(content =>
            content._id === contentId ? { ...content, ...updates } : content
          )
        }
      : state.currentDashboard
  })),
  
  removeContent: (dashId, contentId) => set((state) => ({
    dashboards: state.dashboards.map(dash =>
      dash._id === dashId
        ? { ...dash, contents: dash.contents.filter(c => c._id !== contentId) }
        : dash
    ),
    currentDashboard: state.currentDashboard?._id === dashId
      ? { ...state.currentDashboard, contents: state.currentDashboard.contents.filter(c => c._id !== contentId) }
      : state.currentDashboard
  })),
}));