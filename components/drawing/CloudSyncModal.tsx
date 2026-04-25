'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui-base/Button';
import { Cloud, X, Check, Sparkles, Copy, Globe, Lock, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { drawingApi } from '@/lib/api/drawingApi';
import { toast } from 'sonner';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawing: {
    id: string;
    name: string;
    thumbnail?: string;
  } | null;
}

// Notion-style animated character component
const CloudCharacter = () => (
  <motion.svg 
    width="200" 
    height="160" 
    viewBox="0 0 200 160"
    className="mx-auto"
  >
    {/* Cloud body */}
    <motion.g
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Main cloud shape */}
      <motion.path
        d="M160 80c0-22-18-40-40-40-4 0-8 0.5-12 1.5C103 28 88 18 70 18c-27 0-50 23-50 50 0 2 0.1 4 0.3 6C8 78 0 89 0 102c0 17 14 31 31 31h118c17 0 31-14 31-31 0-10-5-19-13-25-4-3-7-8-7-14v-3z"
        fill="url(#cloudGradient)"
        stroke="#e0e0e0"
        strokeWidth="2"
      />
      
      {/* Face - simple Notion style */}
      <g transform="translate(70, 70)">
        {/* Left eye - blinking */}
        <motion.ellipse
          cx="15"
          cy="10"
          rx="6"
          ry="8"
          fill="#333"
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        />
        {/* Right eye - blinking */}
        <motion.ellipse
          cx="45"
          cy="10"
          rx="6"
          ry="8"
          fill="#333"
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        />
        {/* Happy mouth */}
        <motion.path
          d="M20 30 Q30 45 40 30"
          fill="none"
          stroke="#333"
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ d: ["M20 30 Q30 45 40 30", "M20 32 Q30 50 40 32", "M20 30 Q30 45 40 30"] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {/* Rosy cheeks */}
        <circle cx="5" cy="25" r="6" fill="#ffb3b3" opacity="0.6" />
        <circle cx="55" cy="25" r="6" fill="#ffb3b3" opacity="0.6" />
      </g>
      
      {/* Small floating elements around */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "100px 80px" }}
      >
        <motion.circle cx="175" cy="50" r="4" fill="#a78bfa" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
        <motion.circle cx="25" cy="60" r="3" fill="#60a5fa" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} />
        <motion.circle cx="185" cy="100" r="3" fill="#f472b6" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }} />
      </motion.g>
    </motion.g>
    
    {/* Gradient definition */}
    <defs>
      <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
    </defs>
  </motion.svg>
);

export function CloudSyncModal({ isOpen, onClose, drawing }: CloudSyncModalProps) {
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !drawing) return;
    
    const fetchStatus = async () => {
      setIsLoading(true);
      try {
        const status = await drawingApi.getShareStatus(drawing.id);
        setShareEnabled(status.shareEnabled);
        setShareToken(status.shareToken || null);
      } catch (err) {
        console.error('[CloudSyncModal] Failed to fetch share status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStatus();
  }, [drawing?.id, isOpen]);

  const shareUrl = shareToken 
    ? `${window.location.origin}/draw/share/${shareToken}`
    : null;

  const handleToggleShare = async () => {
    if (!drawing) return;
    setIsToggling(true);
    try {
      if (shareEnabled) {
        await drawingApi.disableShare(drawing.id);
        setShareEnabled(false);
        setShareToken(null);
        toast.success('Sharing disabled');
      } else {
        const result = await drawingApi.enableShare(drawing.id);
        setShareEnabled(true);
        setShareToken(result.shareToken || null);
        toast.success('Sharing enabled');
      }
    } catch (err) {
      console.error('[CloudSyncModal] Failed to toggle share:', err);
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />

          {/* Modal - Notion style: clean, white, playful */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-lg px-4"
          >
            <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl overflow-hidden border border-border-subtle">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-1 right-5 p-1.5 rounded-lg hover:bg-hover-bg text-secondary hover:text-foreground transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Character Section */}
              <div className="pt-8 pb-4 bg-[hsl(var(--sidebar-bg))]" style={{ backgroundImage: 'linear-gradient(color-mix(in srgb, var(--surface-elevated) 40%, transparent), color-mix(in srgb, var(--surface-elevated) 40%, transparent))' }}>
                <CloudCharacter />
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                {/* Badge */}
                <motion.div 
                  className="flex justify-center mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 ${
                    shareEnabled 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-[var(--surface-elevated)] text-secondary border border-border-subtle'
                  }`}>
                    {shareEnabled ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {shareEnabled ? 'Live on Web' : 'Private'}
                  </span>
                </motion.div>

                {/* Title & Description */}
                <motion.div 
                  className="text-center mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Collaborate with anyone 🌏
                  </h2>
                  <p className="text-secondary text-sm leading-relaxed max-w-sm mx-auto">
                    Share a live link to draw together in real-time. No sign-up required for guests!
                  </p>
                </motion.div>

                {/* Drawing preview card */}
                {drawing && (
                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-elevated)] border border-border-subtle mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {drawing.thumbnail ? (
                      <img
                        src={drawing.thumbnail}
                        alt={drawing.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{drawing.name}</p>
                      <p className="text-xs text-secondary">
                        {shareEnabled ? 'Ready to share' : 'Private drawing'}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Share Controls */}
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {isLoading ? (
                    <div className="h-24 flex items-center justify-center">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <>
                      {/* Main Toggle Button */}
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleToggleShare}
                        isLoading={isToggling}
                        leftIcon={shareEnabled ? <LinkIcon className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        className={`w-full transition-all duration-300 font-medium ${
                          shareEnabled 
                            ? 'bg-[var(--surface-elevated)] hover:bg-hover-bg text-foreground border border-border-subtle' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                        }`}
                      >
                        {shareEnabled ? 'Disable Live Link' : 'Generate Live Link'}
                      </Button>

                      {/* Link Copy Section */}
                      <AnimatePresence>
                        {shareEnabled && shareUrl && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="bg-[var(--surface-elevated)] rounded-xl p-1 border border-border-subtle flex items-center gap-1"
                          >
                            <div className="flex-1 px-3 py-2 overflow-hidden">
                              <p className="text-xs font-medium text-zinc-400 mb-0.5">Share this link</p>
                              <p className="text-sm text-zinc-900 dark:text-white truncate font-mono">{shareUrl}</p>
                            </div>
                            
                            <div className="flex gap-1">
                              <button
                                onClick={handleCopy}
                                className="p-2.5 rounded-lg bg-[hsl(var(--card))] hover:bg-hover-bg text-secondary hover:text-foreground shadow-sm border border-border-subtle transition-colors"
                                title="Copy link"
                              >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                              <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-lg bg-[hsl(var(--card))] hover:bg-hover-bg text-secondary hover:text-foreground shadow-sm border border-border-subtle transition-colors"
                                title="Open in new tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
