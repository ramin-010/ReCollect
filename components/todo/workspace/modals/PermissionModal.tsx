import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export function PermissionModal({ isOpen, onClose, message }: PermissionModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4 sm:p-6" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl z-[100] flex flex-col overflow-hidden outline-none font-sans p-6">
          <Dialog.Title className="sr-only">Permission Denied</Dialog.Title>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Action Not Allowed</h3>
            </div>
            <button onClick={onClose} className="ml-auto p-1 text-[hsl(var(--muted-foreground))]/50 hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 leading-relaxed">
            {message || "You don't have permission to perform this action. Viewers cannot modify tasks in this workspace."}
          </p>
          
          <div className="flex justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-medium rounded-lg hover:bg-[hsl(var(--foreground))]/90 transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
