import React from 'react';
import { WorkspaceSettingsProps } from '../types';

export function DangerSettings({
  workspaceName,
  onDeleteWorkspace,
  onClose
}: { workspaceName: string; onDeleteWorkspace?: () => void; onClose: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-rose-400 mb-2">Delete Workspace</h2>
        <p className="text-sm text-white/40">Permanently delete this workspace and all its data. This action cannot be undone.</p>
      </div>
      
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6">
        <h3 className="text-base font-semibold text-rose-300 mb-2">Are you sure you want to do this?</h3>
        <p className="text-sm text-rose-200/60 mb-6">
          This will immediately delete the <strong>{workspaceName}</strong> workspace, along with all associated tasks, spaces, and member access.
        </p>
        
        <button 
           onClick={() => {
             if (onDeleteWorkspace) onDeleteWorkspace();
             onClose();
           }}
           className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Yes, delete this workspace
        </button>
      </div>
    </div>
  );
}
