// components/shared/DeleteConfirmDialog.tsx
'use client';

import { AlertDialog } from '@/components/ui-base/Dialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title: string;
  description: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  title,
  description,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={onConfirm}
      isLoading={isLoading}
      variant="destructive"
    />
  );
}