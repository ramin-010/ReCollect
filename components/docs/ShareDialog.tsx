'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui-base/Button';
import axios from '@/lib/utils/axios';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
  docTitle: string;
}

type ShareRole = 'viewer' | 'editor';

export function ShareDialog({
  open,
  onOpenChange,
  docId,
  docTitle,
}: ShareDialogProps) {
  const [role, setRole] = useState<ShareRole>('viewer');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const handleClose = () => {
    setGeneratedLink('');
    setRole('viewer');
    setHasCopied(false);
    onOpenChange(false);
  };

  const handleGenerateLink = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/create-doc-link', {
        type: 'doc',
        docId: docId,
        role: role
      });

      if (response.data.success) {
        setGeneratedLink(response.data.data.url);
        toast.success(`Link generated with ${role} access`);
      }
    } catch (error) {
      console.error('Failed to generate link:', error);
      toast.error('Failed to generate share link');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setHasCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
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
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Share Document</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] truncate max-w-[280px]">
                {docTitle}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Permission Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                Permission Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setRole('viewer'); setGeneratedLink(''); }}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    role === 'viewer'
                      ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20'
                      : 'border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  <Globe className={`h-6 w-6 mb-2 ${role === 'viewer' ? 'text-blue-500' : 'text-[hsl(var(--muted-foreground))]'}`} />
                  <span className={`text-sm font-medium ${role === 'viewer' ? 'text-blue-500' : 'text-[hsl(var(--foreground))]'}`}>
                    Viewer
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                    Read-only access
                  </span>
                </button>

                <button
                  onClick={() => { setRole('editor'); setGeneratedLink(''); }}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    role === 'editor'
                      ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20'
                      : 'border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  <Lock className={`h-6 w-6 mb-2 ${role === 'editor' ? 'text-amber-500' : 'text-[hsl(var(--muted-foreground))]'}`} />
                  <span className={`text-sm font-medium ${role === 'editor' ? 'text-amber-500' : 'text-[hsl(var(--foreground))]'}`}>
                    Editor
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                    Can edit content
                  </span>
                </button>
              </div>
            </div>

            {/* Generate / Link Display */}
            <div className="pt-2">
              {!generatedLink ? (
                <Button
                  onClick={handleGenerateLink}
                  isLoading={isLoading}
                  className="w-full h-11 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90"
                >
                  Generate Link
                </Button>
              ) : (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    Share Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={generatedLink}
                      className="flex-1 px-3 py-2 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none"
                    />
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      className={`min-w-[44px] px-0 ${hasCopied ? 'text-emerald-500 border-emerald-500 bg-emerald-500/10' : ''}`}
                    >
                      {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Anyone with this link can {role === 'viewer' ? 'view' : 'edit'} this document.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
