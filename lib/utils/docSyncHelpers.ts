import { Doc } from '@/lib/store/docStore';
import { OfflineDoc } from '@/lib/utils/offlineStorage';

/**
 * Merges server docs with offline docs to determine the most up-to-date state
 * and calculate correct sync status.
 */
export function mergeDocsWithOffline(
  serverDocs: any[], 
  offlineDocs: OfflineDoc[]
): Doc[] {
  const offlineContentMap = new Map(
    offlineDocs.map(od => [od.id, od])
  );
  
  // 1. Handle Local-Only Docs (pending creation)
  const pendingDocs = offlineDocs.filter(pd => pd.id.startsWith('local_'));
  const localDocs: Doc[] = pendingDocs.map(pd => ({
    _id: pd.id,
    title: pd.title || 'Untitled',
    yjsState: pd.yjsState,
    docType: 'notes', // default, or could store in offlineDoc
    coverImage: pd.coverImage,
    isPinned: false,
    isArchived: false,
    createdAt: new Date(pd.updatedAt).toISOString(),
    updatedAt: new Date(pd.updatedAt).toISOString(),
    hasUnsyncedChanges: true, // Local-only docs are always unsynced
    syncStatus: 'unsynced' // explicit status
  }));
  
  // 2. Merge Server Docs with Local Changes
  const mergedServerDocs = serverDocs.map((serverDoc: any) => {
    const offlineDoc = offlineContentMap.get(serverDoc._id);
    
    // For collab docs (shared or has collaborators), always use server data
    // They sync via Hocuspocus so we consider them "processed" by that system
    const isCollabDoc = (serverDoc.collaborators && serverDoc.collaborators.length > 0) || 
                        serverDoc.role === 'editor' || 
                        serverDoc.role === 'viewer';
    
    if (isCollabDoc) {
      return { ...serverDoc, hasUnsyncedChanges: false, syncStatus: 'synced' };
    }
    
    // For personal docs: check if there are unsynced local changes
    if (offlineDoc && offlineDoc.yjsState) {
      const serverUpdatedAt = new Date(serverDoc.updatedAt).getTime();
      const offlineUpdatedAt = offlineDoc.updatedAt || 0;
      const offlineServerUpdatedAt = offlineDoc.serverUpdatedAt || 0;
      
      // Unsynced if: 
      // 1. We have no record of server update time (orphan local change)
      // 2. Local update is newer than the last time we synced with server
      // 3. Explicit syncStatus flag is NOT 'synced' (handles 'pending', 'conflict', and undefined/legacy)
      const hasUnsyncedChanges = 
        offlineDoc.syncStatus !== 'synced' || 
        !offlineDoc.serverUpdatedAt || 
        offlineUpdatedAt > offlineServerUpdatedAt;
      
      const syncStatus = hasUnsyncedChanges ? 'unsynced' : 'synced';

      if (offlineUpdatedAt > serverUpdatedAt) {
        // IndexedDB is newer -> use it (user has local pending changes)
        return {
          ...serverDoc,
          yjsState: offlineDoc.yjsState,
          title: offlineDoc.title, // Use local title if newer
          hasUnsyncedChanges,
          syncStatus,
        };
      }
      
      // Server is newer, but we might still have a 'pending' flag if upload failed
      // or if logic says so.
      return { 
        ...serverDoc, 
        hasUnsyncedChanges,
        syncStatus,
      };
    }
    
    // No offline data -> clean server doc
    return { ...serverDoc, hasUnsyncedChanges: false, syncStatus: 'synced' };
  });

  return [...localDocs, ...mergedServerDocs];
}
