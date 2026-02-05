'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Link, Link2Off, Users, ExternalLink } from 'lucide-react';
import { drawingApi } from '@/lib/api/drawingApi';
import { toast } from 'sonner';

interface ShareDrawingModalProps {
  drawingId: string;
  drawingName: string;
  isOpen: boolean;
  onClose: () => void;
  onShareStatusChange?: (enabled: boolean) => void; // Notify parent when share status changes
}

export function ShareDrawingModal({ drawingId, drawingName, isOpen, onClose, onShareStatusChange }: ShareDrawingModalProps) {
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch share status on mount
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchStatus = async () => {
      setIsLoading(true);
      try {
        const status = await drawingApi.getShareStatus(drawingId);
        setShareEnabled(status.shareEnabled);
        setShareToken(status.shareToken || null);
      } catch (err) {
        console.error('[ShareModal] Failed to fetch share status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStatus();
  }, [drawingId, isOpen]);

  const shareUrl = shareToken 
    ? `${window.location.origin}/draw/share/${shareToken}`
    : null;

  const handleToggleShare = async () => {
    setIsToggling(true);
    try {
      if (shareEnabled) {
        await drawingApi.disableShare(drawingId);
        setShareEnabled(false);
        onShareStatusChange?.(false);
        toast.success('Sharing disabled');
      } else {
        const result = await drawingApi.enableShare(drawingId);
        setShareEnabled(true);
        setShareToken(result.shareToken || null);
        onShareStatusChange?.(true);
        toast.success('Sharing enabled');
      }
    } catch (err) {
      console.error('[ShareModal] Failed to toggle share:', err);
      toast.error('Failed to update sharing');
    } finally {
      setIsToggling(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Share Drawing</h2>
              <p className="text-sm text-zinc-400 truncate max-w-[200px]">{drawingName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {shareEnabled ? (
                    <Link className="w-5 h-5 text-green-400" />
                  ) : (
                    <Link2Off className="w-5 h-5 text-zinc-500" />
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {shareEnabled ? 'Sharing enabled' : 'Sharing disabled'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {shareEnabled 
                        ? 'Anyone with the link can collaborate'
                        : 'Only you can access this drawing'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleShare}
                  disabled={isToggling}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors
                    ${shareEnabled ? 'bg-green-500' : 'bg-zinc-600'}
                    ${isToggling ? 'opacity-50' : ''}
                  `}
                >
                  <span 
                    className={`
                      absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                      ${shareEnabled ? 'left-7' : 'left-1'}
                    `}
                  />
                </button>
              </div>

              {/* Share Link */}
              {shareEnabled && shareUrl && (
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Share link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className="p-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Copy className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-5 h-5 text-zinc-300" />
                    </a>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="text-xs text-zinc-500 space-y-1">
                <p>• Guests can edit in real-time without logging in</p>
                <p>• All changes sync automatically to the cloud</p>
                <p>• Only you (the owner) can manage this drawing</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
