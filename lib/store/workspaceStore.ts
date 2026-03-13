import { create } from 'zustand';
import { workspaceApi } from '@/lib/api/workspaceApi';
import { workspaceTodoApi } from '@/lib/api/workspaceTodoApi';
import { toast } from 'sonner';


const pendingUpdates = new Map<string, any>();        
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>(); 
const DEBOUNCE_MS = 1000;

interface WorkspaceStore {
  workspaces: any[];
  selectedWorkspace: any | null;
  activeSpaceId: string | null;
  tasks: any[];
  stats: any | null;
  activity: any[];
  isLoading: boolean;
  isDataLoading: boolean;

 
  setWorkspaces: (workspaces: any[]) => void;
  setSelectedWorkspace: (workspace: any | null) => void;
  setActiveSpaceId: (spaceId: string | null) => void;
  setTasks: (tasks: any[]) => void;
  setStats: (stats: any | null) => void;
  setActivity: (activity: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsDataLoading: (loading: boolean) => void;

 
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspaceData: (workspaceId: string, spaceId: string | undefined, canViewOverview: boolean) => Promise<void>;
  
 
  updateTaskLocal: (taskId: string, updates: any) => void;
  addTask: (task: any) => void;
  addWorkspace: (workspace: any) => void;
  updateWorkspace: (workspaceId: string, updates: any) => void;

 
  updateTask: (taskId: string, updates: any, onPermissionError?: (msg: string) => void) => void;
  updateTaskImmediate: (taskId: string, updates: any, onPermissionError?: (msg: string) => void) => Promise<boolean>;
  flushTaskUpdate: (taskId: string) => void;
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
    const { workspaces } = get();
    if (workspaces.length === 0) set({ isLoading: true });
    
    try {
      const res = await workspaceApi.getWorkspaces();
      if (res.success) {
        set({ workspaces: res.data });
        
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

 
  updateTaskLocal: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === taskId ? { ...t, ...updates } : t)),
    }));
  },

 
  updateTask: (taskId, updates, onPermissionError) => {
   
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === taskId ? { ...t, ...updates } : t)),
    }));

   
    const existing = pendingUpdates.get(taskId) || {};
    const merged = { ...existing, ...updates };
    pendingUpdates.set(taskId, merged);

   
    const existingTimer = debounceTimers.get(taskId);
    if (existingTimer) clearTimeout(existingTimer);

   
    const timer = setTimeout(async () => {
      const payload = pendingUpdates.get(taskId);
      pendingUpdates.delete(taskId);
      debounceTimers.delete(taskId);

      if (!payload) return;

      try {
        const res = await workspaceTodoApi.updateTodo(taskId, payload);
        if (!res.success) {
          const errMsg = res.message?.toLowerCase() || '';
          if (errMsg.includes('permission') || errMsg.includes('unauthorized')) {
            onPermissionError?.(res.message || 'Permission restricted.');
          } else {
            toast.error(res.message || 'Failed to update task');
          }
        }
      } catch {
        toast.error('Failed to update task');
      }
    }, DEBOUNCE_MS);

    debounceTimers.set(taskId, timer);
  },

  updateTaskImmediate: async (taskId, updates, onPermissionError) => {
    // 1. Optimistic local update
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === taskId ? { ...t, ...updates } : t)),
    }));

    // 2. Clear any pending debounced updates for this task
    const existingTimer = debounceTimers.get(taskId);
    if (existingTimer) clearTimeout(existingTimer);
    
    // 3. Merge with any existing pending updates
    const existing = pendingUpdates.get(taskId) || {};
    const finalPayload = { ...existing, ...updates };
    pendingUpdates.delete(taskId);
    debounceTimers.delete(taskId);

    if (Object.keys(finalPayload).length === 0) return true;

    try {
      const res = await workspaceTodoApi.updateTodo(taskId, finalPayload);
      if (res.success) {
        return true;
      } else {
        const errMsg = res.message?.toLowerCase() || '';
        if (errMsg.includes('permission') || errMsg.includes('unauthorized')) {
          onPermissionError?.(res.message || 'Permission restricted.');
        } else {
          toast.error(res.message || 'Failed to update task');
        }
        return false;
      }
    } catch (error) {
      toast.error('Failed to update task');
      return false;
    }
  },
 
  flushTaskUpdate: (taskId) => {
    const existingTimer = debounceTimers.get(taskId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      debounceTimers.delete(taskId);
    }

    const payload = pendingUpdates.get(taskId);
    pendingUpdates.delete(taskId);

    if (!payload) return;

   
    workspaceTodoApi.updateTodo(taskId, payload).catch(() => {
      toast.error('Failed to update task');
    });
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
