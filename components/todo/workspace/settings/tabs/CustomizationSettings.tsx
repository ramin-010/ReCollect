import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { workspaceApi } from '@/lib/api/workspaceApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CustomizationSettings({
  selectedWorkspace,
  isAdmin,
}: {
  selectedWorkspace: any;
  isAdmin: boolean;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [membersCanViewOverview, setMembersCanViewOverview] = useState(
    selectedWorkspace?.settings?.membersCanViewOverview || false
  );

  const handleToggleOverview = async (checked: boolean) => {
    if (!isAdmin) return;
    
    setIsUpdating(true);
    setMembersCanViewOverview(checked);

    try {
      await workspaceApi.updateWorkspaceSettings(selectedWorkspace._id, {
        membersCanViewOverview: checked,
      });
      toast.success('Workspace settings updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
      setMembersCanViewOverview(!checked); // Revert
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">Customization</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Personalize your workspace appearance and details.</p>
      </div>
      
      <div className="space-y-6">
        {/* Toggle: Members can view overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10">
          <div>
            <h3 className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">Overview Dashboard Visibility</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm">
              Allow non-admin members to view the workspace overview statistics and activity feed. By default, this is restricted to Owners and Admins.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            {isUpdating && <Loader2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]/50 animate-spin" />}
            <button
              disabled={!isAdmin || isUpdating}
              onClick={() => handleToggleOverview(!membersCanViewOverview)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:cursor-not-allowed disabled:opacity-50",
                membersCanViewOverview ? "bg-indigo-500" : "bg-[hsl(var(--muted))]/40"
              )}
            >
              <span className="sr-only">Toggle members can view overview</span>
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[hsl(var(--background))] shadow-lg ring-0 transition duration-200 ease-in-out",
                  membersCanViewOverview ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
