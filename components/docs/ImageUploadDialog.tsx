'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageUpload: (url: string) => void;
}

export function ImageUploadDialog({
  open,
  onOpenChange,
  onImageUpload,
}: ImageUploadDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'embed'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setImageUrl('');
    setActiveTab('upload');
    onOpenChange(false);
  };

  const processFile = (file: File) => {
    if (file.type.indexOf('image/') === 0) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageUpload(e.target.result as string);
          handleClose();
        }
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Invalid file type. Please upload an image.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleEmbed = () => {
    if (imageUrl) {
      onImageUpload(imageUrl);
      handleClose();
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
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Add Image</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex p-2 gap-2 border-b border-[hsl(var(--border))]">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'upload'
                  ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50'
              }`}
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <button
              onClick={() => setActiveTab('embed')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'embed'
                  ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50'
              }`}
            >
              <LinkIcon className="h-4 w-4" />
              Embed Link
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'upload' ? (
              <div
                className={`relative flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl transition-colors ${
                  dragActive
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileInput}
                />
                
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3">
                     <div className="w-8 h-8 border-3 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                     <p className="text-sm text-[hsl(var(--muted-foreground))]">Processing image...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 mb-4 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      SVG, PNG, JPG or GIF (max 5MB)
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    Image Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.png"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmbed()}
                    className="w-full px-4 py-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleEmbed}
                  disabled={!imageUrl}
                  className="w-full py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Embed Image
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
