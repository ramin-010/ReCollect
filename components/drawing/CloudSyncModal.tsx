'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui-base/Button';
import { Cloud, X, Check, Sparkles } from 'lucide-react';
import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawing: {
    id: string;
    name: string;
    data: any;
    thumbnail?: string;
  } | null;
  onSyncComplete: (drawingId: string) => void;
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

export function CloudSyncModal({ isOpen, onClose, drawing, onSyncComplete }: CloudSyncModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  // Helper to convert base64 dataURL to Blob
  const dataURLtoBlob = (dataURL: string): Blob | null => {
    try {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.error('Failed to convert dataURL to Blob:', e);
      return null;
    }
  };

  const handleSync = async () => {
    if (!drawing) return;

    setIsSyncing(true);
    setLimitReached(false);
    try {
      const formData = new FormData();
      const imageFileIds: string[] = [];
      
      // Clone the data to avoid mutating the original
      const dataToSend = JSON.parse(JSON.stringify(drawing.data));

      // Extract images from Excalidraw files object
      if (dataToSend.files && typeof dataToSend.files === 'object') {
        for (const [fileId, fileData] of Object.entries(dataToSend.files as Record<string, any>)) {
          // Check if this file has a base64 dataURL (not already cloud uploaded)
          if (fileData.dataURL && fileData.dataURL.startsWith('data:') && !fileData.isCloudUploaded) {
            const blob = dataURLtoBlob(fileData.dataURL);
            if (blob) {
              const file = new File([blob], `${fileId}.webp`, { type: blob.type });
              formData.append(`image_${fileId}`, file);
              imageFileIds.push(fileId);
              
              // Remove the base64 data from the JSON (will be replaced by cloud URL on backend)
              dataToSend.files[fileId] = {
                ...fileData,
                dataURL: 'PENDING_UPLOAD'
              };
            }
          }
        }
      }

      // Upload thumbnail if it's a base64 data URL
      if (drawing.thumbnail && drawing.thumbnail.startsWith('data:')) {
        const thumbnailBlob = dataURLtoBlob(drawing.thumbnail);
        if (thumbnailBlob) {
          const thumbnailFile = new File([thumbnailBlob], 'thumbnail.webp', { type: thumbnailBlob.type });
          formData.append('thumbnail', thumbnailFile);
        }
      } else {
        formData.append('thumbnail', drawing.thumbnail || '');
      }

      formData.append('localId', drawing.id);
      formData.append('name', drawing.name);
      formData.append('data', JSON.stringify(dataToSend));
      formData.append('imageFileIds', JSON.stringify(imageFileIds));

      await axiosInstance.post('/api/drawings/sync', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSyncSuccess(true);
      onSyncComplete(drawing.id);
      toast.success('Drawing synced to cloud!');
      
      setTimeout(() => {
        setSyncSuccess(false);
        onClose();
      }, 1500);
    } catch (error: any) {
      // Check if it's a limit reached error (403)
      if (error.response?.status === 403) {
        setLimitReached(true);
      } else {
        toast.error('Failed to sync drawing', {
          description: error.response?.data?.message || 'Please try again'
        });
      }
    } finally {
      setIsSyncing(false);
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
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-zinc-800">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-1 right-5 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Character Section */}
              <div className="pt-8 pb-4 bg-gradient-to-b from-blue-50 to-white dark:from-zinc-800 dark:to-zinc-900">
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
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    New Feature
                  </span>
                </motion.div>

                {/* Title & Description */}
                <motion.div 
                  className="text-center mb-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Save to the cloud ☁️
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    Your drawings will be safely stored and accessible from any device. Never lose your work again!
                  </p>
                </motion.div>

                {/* Drawing preview card */}
                {drawing && (
                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 mb-5"
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
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{drawing.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ready to sync</p>
                    </div>
                  </motion.div>
                )}

                {/* Limit Reached Warning */}
                {limitReached && (
                  <motion.div
                    className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                        <span className="text-xl">⚠️</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-1">
                          Cloud Sync Limit Reached
                        </h3>
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                          Free users can sync up to <strong>3 drawings</strong> to the cloud. Delete an existing cloud drawing to sync a new one, or upgrade for unlimited cloud storage.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Action buttons */}
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {!limitReached ? (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleSync}
                      isLoading={isSyncing}
                      disabled={syncSuccess}
                      leftIcon={syncSuccess ? <Check className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                      className={`w-full ${syncSuccess ? 'bg-green-500 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {syncSuccess ? 'Synced!' : 'Sync to Cloud'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={onClose}
                      className="w-full bg-amber-500 hover:bg-amber-600"
                    >
                      Got it
                    </Button>
                  )}
                  
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {limitReached ? 'Close' : 'Maybe later'}
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
