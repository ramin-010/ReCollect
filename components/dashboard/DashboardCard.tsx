// components/dashboard/DashboardCard.tsx
'use client';

import { useState } from 'react';
import { Dashboard } from '@/lib/utils/types';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { dashboardApi } from '@/lib/api/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { MoreVertical, Edit, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { EditDashboardDialog } from './EditDashboardDialog';
import { DeleteConfirmDialog } from '../shared/DeleteConfirmDialog';

interface DashboardCardProps {
  dashboard: Dashboard;
}

export function DashboardCard({ dashboard }: DashboardCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const setCurrentDashboard = useDashboardStore((state) => state.setCurrentDashboard);
  const removeDashboard = useDashboardStore((state) => state.removeDashboard);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
     
      const response = await dashboardApi.delete(dashboard._id);
      if (response.success) {
        removeDashboard(dashboard._id);
        toast.success('Dashboard deleted', {
          description: 'The dashboard and its contents have been deleted.',
        });
        setIsDeleteOpen(false);
      }
    } catch (error: any) {
      toast.error('Failed to delete', {
        description: error.response?.data?.message || 'Something went wrong.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        className="pro-card hover-lift relative overflow-hidden cursor-pointer group"
        onClick={() => setCurrentDashboard(dashboard)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(15,23,42,0.75)] via-transparent to-[rgba(15,23,42,0.45)] " />
        <div className="absolute right-0 top-1/2 h-32 w-32 -translate-y-1/2 rotate-12 rounded-full bg-[rgba(59,130,246,0.2)] blur-3xl opacity-0 group-hover:opacity-80 transition-opacity" />
        <CardHeader className="relative z-10 ">
          <div className="flex items-start justify-between gap-4">
            
            <div className="flex-1 min-w-0">
              <CardDescription className="text-[0.65rem] pb-2 uppercase tracking-[0.4em] text-[hsl(var(--muted-foreground))] opacity-80">
                Dashboard
              </CardDescription>
              <CardTitle className="text-3xl font-semibold leading-tight text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                {dashboard.name}
              </CardTitle>
              <p className="text-sm pt-1 text-[hsl(var(--muted-foreground))] opacity-70 line-clamp-2">
                {dashboard.description || 'A personal collection that tracks your most important notes.'}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 rounded-full opacity-80 hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditOpen(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[hsl(var(--destructive))]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 pt-3">
          <div className="grid gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">Notes</p>
              <p className="mt-1 text-4xl font-bold text-[hsl(var(--foreground))]">
                {dashboard.contents?.length || 0}
              </p>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              This dashboard gathers the notes and sketches you keep for this topic—tap to explore everything inside.
            </p>
          </div>
        </CardContent>
      </Card>

      <EditDashboardDialog
        dashboard={dashboard}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Dashboard"
        description={`Are you sure you want to delete "${dashboard.name}"? This will also delete all notes in this dashboard. This action cannot be undone.`}
      />
    </>
  );
}