import React from 'react';
import { WorkspaceSettingsProps } from '../types';

export function DangerSettings({
  workspaceName,
  onDeleteWorkspace,
  onClose,
  isOwner,
  onLeaveWorkspace
}: { 
  workspaceName: string; 
  onDeleteWorkspace?: () => void; 
  onClose: () => void;
  isOwner: boolean;
  onLeaveWorkspace?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-rose-400 mb-2">
          {isOwner ? 'Delete Workspace' : 'Leave Workspace'}
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {isOwner 
            ? 'Permanently delete this workspace and all its data. This action cannot be undone.'
            : 'Leave this workspace. You will lose access to all tasks and spaces within it.'}
        </p>
      </div>
      
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6">
        <h3 className="text-base font-semibold text-rose-300 mb-2">Are you sure you want to do this?</h3>
        <p className="text-sm text-rose-200/60 mb-6">
          {isOwner 
            ? <>This will immediately delete the <strong>{workspaceName}</strong> workspace, along with all associated tasks, spaces, and member access.</>
            : <>This will immediately remove your membership from the <strong>{workspaceName}</strong> workspace.</>}
        </p>
        
        <button 
           onClick={() => {
             if (isOwner && onDeleteWorkspace) {
               onDeleteWorkspace();
             } else if (!isOwner && onLeaveWorkspace) {
               onLeaveWorkspace();
             }
             onClose();
           }}
           className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-[hsl(var(--background))] text-sm font-medium rounded-lg transition-colors"
        >
          {isOwner ? 'Yes, delete this workspace' : 'Yes, leave this workspace'}
        </button>
      </div>
    </div>
  );
}
