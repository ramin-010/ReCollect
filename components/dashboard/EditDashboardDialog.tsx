// components/dashboard/EditDashboardDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dashboard } from '@/lib/utils/types';
import { dashboardApi } from '@/lib/api/dashboard';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui-base/Dialog';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { Textarea } from '@/components/ui-base/Textarea';
import { Label } from '@/components/ui-base/Label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const dashboardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  description: z.string().optional(),
});

type DashboardFormData = z.infer<typeof dashboardSchema>;

interface EditDashboardDialogProps {
  dashboard: Dashboard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDashboardDialog({ dashboard, open, onOpenChange }: EditDashboardDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const updateDashboard = useDashboardStore((state) => state.updateDashboard);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DashboardFormData>({
    resolver: zodResolver(dashboardSchema),
    defaultValues: {
      name: dashboard.name,
      description: dashboard.description || '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: dashboard.name,
        description: dashboard.description || '',
      });
    }
  }, [open, dashboard, reset]);

  const onSubmit = async (data: DashboardFormData) => {
    setIsLoading(true);
    try {
      const response = await dashboardApi.update(dashboard._id, data);
      if (response.success && response.data) {
        updateDashboard(dashboard._id, response.data);
        toast.success('Dashboard updated', {
          description: 'Your dashboard has been updated successfully.',
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error('Failed to update', {
        description: error.response?.data?.message || 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Edit Dashboard</DialogTitle>
          <DialogDescription>
            Update your dashboard name and description.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-[hsl(var(--destructive))]">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Textarea
              id="edit-description"
              {...register('description')}
              disabled={isLoading}
              rows={3}
            />
          </div>
        </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}