// components/shared/CustomShareDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, ExternalLink, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface CustomShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onGenerateLink: () => Promise<string>;
  shareUrl?: string;
  isLoading?: boolean;
}

export function CustomShareDialog({
  open,
  onOpenChange,
  title,
  description,
  onGenerateLink,
  shareUrl: externalShareUrl,
  isLoading: externalIsLoading = false
}: CustomShareDialogProps) {
  const [shareUrl, setShareUrl] = useState(externalShareUrl || '');
  const [isLoading, setIsLoading] = useState(externalIsLoading);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (externalShareUrl) {
      setShareUrl(externalShareUrl);
    }
  }, [externalShareUrl]);

  useEffect(() => {
    setIsLoading(externalIsLoading);
  }, [externalIsLoading]);

  const handleGenerateLink = async () => {
    setIsLoading(true);
    try {
      const url = await onGenerateLink();
      setShareUrl(url);
      toast.success('Share link generated! 🔗', {
        description: 'Your link is ready to share.',
      });
    } catch (error) {
      toast.error('Failed to generate link', {
        description: 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast.success('Copied! 📋', {
        description: 'Share link copied to clipboard.',
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy', {
        description: 'Please copy the link manually.',
      });
    }
  };

  const handleClose = () => {
    setShareUrl('');
    setIsCopied(false);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />
        
        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md mx-4 bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                <Share2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {shareUrl ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Share URL Display */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    Share Link
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="w-full px-4 py-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg text-sm font-mono pr-10"
                      />
                      <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <button
                      onClick={handleCopy}
                      className="px-4 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary))]/90 transition-colors flex items-center gap-2 font-medium"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[hsl(var(--muted))]/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">EXPIRES</span>
                    </div>
                    <p className="text-sm font-medium">60 days</p>
                  </div>
                  <div className="p-3 bg-[hsl(var(--muted))]/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">ACCESS</span>
                    </div>
                    <p className="text-sm font-medium">Public</p>
                  </div>
                </div>

                {/* Warning */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Anyone with this link can view your content. Share responsibly.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto bg-[hsl(var(--muted))] rounded-full flex items-center justify-center">
                  <Share2 className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Ready to share?</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Generate a secure link that others can use to access your content.
                  </p>
                </div>
                <button
                  onClick={handleGenerateLink}
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </div>
                  ) : (
                    'Generate Share Link'
                  )}
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
