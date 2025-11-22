// components/content/ShareContentDialog.tsx
'use client';

import { useState } from 'react';
import { Content } from '@/lib/utils/types';
import { shareLinkApi } from '@/lib/api/shareLink';
import { CustomShareDialog } from '../shared/CustomShareDialog';

interface ShareContentDialogProps {
  content: Content;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareContentDialog({ content, open, onOpenChange }: ShareContentDialogProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateLink = async (): Promise<string> => {
    setIsLoading(true);
    try {
      const response = await shareLinkApi.createContentLink({
        type: 'content',
        contentId: content._id,
      });
      
      if (response.success && response.data?.url) {
        const url = response.data.url;
        setShareUrl(url);
        setIsLoading(false);
        return url;
      }
      
      throw new Error(response.message || 'Failed to generate link');
    } catch (error: any) {
      setIsLoading(false);
      throw error;
    }
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
      title="Share Note"
      description="Share your note with others"
      onGenerateLink={handleGenerateLink}
      shareUrl={shareUrl}
      isLoading={isLoading}
    />
  );
}