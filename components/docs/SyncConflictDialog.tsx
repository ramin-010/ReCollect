'use client';

import React from 'react';
import { format } from 'date-fns';
import { Cloud, Clock, Copy, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';

interface SyncConflictDialogProps {
  open: boolean;
  onClose: () => void;
  localUpdatedAt: number;
  serverUpdatedAt: number;
  onAcceptServer: () => void;
  onKeepMine: () => void;
  onSaveAsNew: () => void;
}

export function SyncConflictDialog({
  open,
  onClose,
  localUpdatedAt,
  serverUpdatedAt,
  onAcceptServer,
  onKeepMine,
  onSaveAsNew,
}: SyncConflictDialogProps) {
  if (!open) return null;

  const localDate = format(new Date(localUpdatedAt), 'MMM d, yyyy h:mm a');
  const serverDate = format(new Date(serverUpdatedAt), 'MMM d, yyyy h:mm a');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl w-[480px] p-6 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              Server Has Newer Changes
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              This document was updated elsewhere
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          <p className="text-sm text-[hsl(var(--foreground))/80]">
            A newer version of this document exists on the server. 
            Your local version may have unsaved changes that could be overwritten.
          </p>

          {/* Version comparison */}
          <div className="grid grid-cols-2 gap-3">
            {/* Local version (older) */}
            <div className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Your Version</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                <Clock className="w-3 h-3" />
                <span>{localDate}</span>
              </div>
            </div>

            {/* Server version (newer) */}
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Server Version</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">NEWER</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                <Clock className="w-3 h-3" />
                <span>{serverDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            onClick={() => {
              onAcceptServer();
              onClose();
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium"
          >
            <Download className="w-4 h-4 mr-2" />
            Accept Server Version
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                onKeepMine();
                onClose();
              }}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            >
              Keep My Changes
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                onSaveAsNew();
                onClose();
              }}
              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            >
              <Copy className="w-4 h-4 mr-1" />
              Save as New
            </Button>
          </div>
          
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-[hsl(var(--muted-foreground))] text-sm"
          >
            Decide Later
          </Button>
        </div>
      </div>
    </div>
  );
}
