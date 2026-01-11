'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Eye, Pencil, Sparkles, Globe, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import axios from '@/lib/utils/axios';
import { cn } from '@/lib/utils'; // Assuming you have a cn utility, if not I'll use template literals but cn is safer for tailwind merging. I'll stick to template literals if unsure, but standard shadcn/ui setups have it. I'll use standard className strings to be safe.

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
        // Don't toast here, the UI update is enough feedback
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          onClick={handleClose}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg overflow-hidden rounded-xl bg-[#121212] border border-white/10 shadow-2xl shadow-black/80" // Solid opaque background
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-2 flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                Share Doc <Sparkles className="w-4 h-4 text-blue-400 transition-colors duration-500" />
              </h2>
              <p className="text-sm text-zinc-400 max-w-[340px] truncate">
                {docTitle || 'Untitled Document'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Role Tab Switcher - Professional implementation */}
            <div className="relative flex p-1 rounded-lg bg-zinc-900 border border-white/5">
              <motion.div
                className="absolute top-1 bottom-1 rounded-md shadow-sm border border-blue-500/20 bg-blue-500/10"
                initial={false}
                animate={{
                  left: role === 'viewer' ? '4px' : '50%',
                  width: 'calc(50% - 4px)',
                  x: role === 'viewer' ? 0 : 0
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
              
              <button
                onClick={() => { setRole('viewer'); setGeneratedLink(''); }}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${role === 'viewer' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Eye className="w-4 h-4" />
                <span>Viewer</span>
              </button>
              
              <button
                onClick={() => { setRole('editor'); setGeneratedLink(''); }}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${role === 'editor' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Pencil className="w-4 h-4" />
                <span>Editor</span>
              </button>
            </div>

            {/* Dynamic Content Area */}
            <div className="min-h-[100px] flex flex-col justify-end">
              <AnimatePresence mode="wait">
                {!generatedLink ? (
                  <motion.div
                    key="generate"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="p-4 rounded-xl border flex gap-3 items-start transition-colors duration-300 bg-blue-500/5 border-blue-500/10">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        {role === 'viewer' ? <Globe className="w-5 h-5 text-blue-400" /> : <LinkIcon className="w-5 h-5 text-blue-400" />}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-blue-100">
                          {role === 'viewer' ? 'Public Read Access' : 'Collaborative Edit Access'}
                        </h4>
                        <p className="text-xs leading-relaxed text-blue-200/60">
                          {role === 'viewer' 
                            ? 'Anyone with the link can view this document perfectly.' 
                            : 'Anyone with the link can edit and collaborate with you in real-time.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateLink}
                      disabled={isLoading}
                      className="group w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>
                          Generate Link <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400 ml-1">Unique Link</label>
                      <div 
                        className="group relative flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                        onClick={copyToClipboard}
                      >
                        <LinkIcon className="w-4 h-4 text-zinc-500" />
                        <div className="flex-1 overflow-hidden">
                          <input 
                            readOnly 
                            value={generatedLink} 
                            className="w-full bg-transparent text-sm text-zinc-300 focus:outline-none cursor-pointer"
                          />
                          {/* Gradient fade on the right of input for long URLs */}
                          <div className="absolute right-12 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-[#121212] pointer-events-none" />
                        </div>
                        
                        <button
                          className={`p-2 rounded-lg text-sm font-medium transition-all ${
                            hasCopied 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-zinc-800 text-white group-hover:bg-zinc-700'
                          }`}
                        >
                          {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-center"
                    >
                      <p className="text-[11px] text-zinc-500">
                        Link generated successfully. Valid for {role}.
                      </p>
                      <button 
                         onClick={() => setGeneratedLink('')}
                         className="text-[11px] text-zinc-400 hover:text-white mt-2 underline decoration-zinc-700 underline-offset-2 transition-colors"
                      >
                        Generate a different link
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
