import { ServerDrawing, ExcalidrawFile } from '@/lib/api/drawingApi';

export interface ExcalidrawYjsEditorProps {
  drawingId: string;
  drawingName: string;
  isOwner?: boolean;
  collaborationEnabled?: boolean;
  theme?: 'light' | 'dark';
  onReady?: () => void;
  onStateChange?: (hasUnsavedChanges: boolean) => void;
  onSyncStatusChange?: (status: 'synced' | 'unsynced' | 'offline') => void;
  onCollaboratorCountChange?: (count: number) => void;
}

export interface ConflictData {
  localUpdatedAt: number;
  serverUpdatedAt: number;
  serverDrawing: ServerDrawing;
}

export type SyncStatus = 'synced' | 'unsynced' | 'offline';