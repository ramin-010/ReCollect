// components/dashboard/ShareDashboardDialog.tsx
'use client';

import { useState } from 'react';
import { Dashboard } from '@/lib/utils/types';
import { shareLinkApi } from '@/lib/api/shareLink';
import { CustomShareDialog } from '../shared/CustomShareDialog';

interface ShareDashboardDialogProps {
  dashboard: Dashboard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
interface Response {
  url : string,
  success : boolean
}

export function ShareDashboardDialog({ dashboard, open, onOpenChange }: ShareDashboardDialogProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateLink = async (): Promise<string> => {
        console.log('hit')

    const response = await shareLinkApi.createDashLink({
      type: 'dashboard',
      dashId: dashboard._id,
    });
      
    if (response.success && response.data?.url) {
      const url = response.data.url;
    
      setShareUrl(url);
      return url;
    }
    
    throw new Error(response.message || 'Failed to generate link');
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setShareUrl('');
      setIsLoading(false);
    }
    onOpenChange(open);
  };

  return (
    <CustomShareDialog
      open={open}
      onOpenChange={handleClose}
      title="Share Dashboard"
      description="Share your dashboard with others"
      onGenerateLink={handleGenerateLink}
      shareUrl={shareUrl}
      isLoading={isLoading}
    />
  );
}