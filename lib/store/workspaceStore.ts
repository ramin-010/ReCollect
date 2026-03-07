import { create } from 'zustand';
import { workspaceApi } from '@/lib/api/workspaceApi';

interface WorkspaceStore {
  workspaces: any[];
  selectedWorkspace: any | null;
  activeSpaceId: string | null;
  tasks: any[];
  stats: any | null;
  activity: any[];
  isLoading: boolean;
  isDataLoading: boolean;

  // Actions
  setWorkspaces: (workspaces: any[]) => void;
  setSelectedWorkspace: (workspace: any | null) => void;
  setActiveSpaceId: (spaceId: string | null) => void;
  setTasks: (tasks: any[]) => void;
  setStats: (stats: any | null) => void;
  setActivity: (activity: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsDataLoading: (loading: boolean) => void;

  // Thunks / Async actions
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspaceData: (workspaceId: string, spaceId: string | undefined, canViewOverview: boolean) => Promise<void>;
  
  // Optimistic updates
  updateTask: (taskId: string, updates: any) => void;
  addTask: (task: any) => void;
  addWorkspace: (workspace: any) => void;
  updateWorkspace: (workspaceId: string, updates: any) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  selectedWorkspace: null,
  activeSpaceId: null,
  tasks: [],
  stats: null,
  activity: [],
  isLoading: true,
  isDataLoading: false,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setSelectedWorkspace: (workspace) => set({ selectedWorkspace: workspace }),
  setActiveSpaceId: (spaceId) => set({ activeSpaceId: spaceId }),
  setTasks: (tasks) => set({ tasks }),
  setStats: (stats) => set({ stats }),
  setActivity: (activity) => set({ activity }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsDataLoading: (loading) => set({ isDataLoading: loading }),

  fetchWorkspaces: async () => {
    const { workspaces, selectedWorkspace, isLoading } = get();
    // Only set strictly to generating loader if we have zero workspaces cached
    if (workspaces.length === 0) set({ isLoading: true });
    
    try {
      const res = await workspaceApi.getWorkspaces();
      if (res.success) {
        set({ workspaces: res.data });
        
        // Auto-select first workspace if none selected
        if (!get().selectedWorkspace && res.data.length > 0) {
          const firstWorkspace = res.data[0];
          set({ selectedWorkspace: firstWorkspace });
          if (firstWorkspace.spaces && firstWorkspace.spaces.length > 0) {
            set({ activeSpaceId: firstWorkspace.spaces[0]._id });
          } else {
            set({ activeSpaceId: 'all' });
          }
        }
      }
    } catch (e) {
      console.error('Failed to load workspaces', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkspaceData: async (workspaceId, spaceId, canViewOverview) => {
    const { tasks } = get();
    // Only show full loading spinner if we have no tasks cached for instant feel
    if (tasks.length === 0) set({ isDataLoading: true });
    
    try {
      const fetches: Promise<any>[] = [
        workspaceApi.getWorkspaceActivity(workspaceId),
        workspaceApi.getWorkspaceTasks(workspaceId, spaceId !== 'all' ? spaceId : undefined),
      ];

      if (canViewOverview) {
        fetches.push(workspaceApi.getWorkspaceStats(workspaceId, spaceId !== 'all' ? spaceId : undefined));
      }

      const results = await Promise.all(fetches);
      
      if (results[0].success) set({ activity: results[0].data });
      if (results[1].success) set({ tasks: results[1].data });
      if (canViewOverview && results[2]?.success) set({ stats: results[2].data });
    } catch (e) {
      console.error('Failed to load workspace data', e);
    } finally {
      set({ isDataLoading: false });
    }
  },

  updateTask: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === taskId ? { ...t, ...updates } : t)),
    }));
  },

  addTask: (task) => {
    set((state) => ({
      tasks: [task, ...state.tasks],
    }));
  },

  addWorkspace: (workspace) => {
    set((state) => ({
      workspaces: [workspace, ...state.workspaces],
    }));
  },

  updateWorkspace: (workspaceId, updates) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w._id === workspaceId ? { ...w, ...updates } : w)),
    }));
  }
}));
