'use client';

import React from 'react';
import { format } from 'date-fns';
import { Clock, Copy, Download, FileText, X, Layers, Box } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface SlideConflictDialogProps {
  open: boolean;
  onClose: () => void;
  localUpdatedAt: number;
  serverUpdatedAt: number;
  localSummary: { slideCount: number; blockCount: number; name: string };
  serverSummary: { slideCount: number; blockCount: number; name: string };
  onAcceptServer: () => void;
  onKeepMine: () => void;
  onSaveAsNew: () => void;
}

function VersionCard({
  label,
  color,
  date,
  summary,
}: {
  label: string;
  color: 'emerald' | 'blue';
  date: string;
  summary: { slideCount: number; blockCount: number; name: string };
}) {
  const borderColor = color === 'emerald' ? 'border-emerald-500/30' : 'border-blue-500/30';
  const bgColor = color === 'emerald' ? 'bg-emerald-500/5' : 'bg-blue-500/5';
  const textColor = color === 'emerald' ? 'text-emerald-400' : 'text-blue-400';

  return (
    <div className={`flex-1 rounded-xl border ${borderColor} ${bgColor} p-6 flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${textColor}`}>{label}</span>
        <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {date}
        </span>
      </div>
      <div className="space-y-3">
        <h4 className="text-lg font-bold text-[hsl(var(--foreground))] truncate">
          {summary.name || 'Untitled Deck'}
        </h4>
        <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            {summary.slideCount} slide{summary.slideCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Box className="w-4 h-4" />
            {summary.blockCount} block{summary.blockCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SlideConflictDialog({
  open,
  onClose,
  localUpdatedAt,
  serverUpdatedAt,
  localSummary,
  serverSummary,
  onAcceptServer,
  onKeepMine,
  onSaveAsNew,
}: SlideConflictDialogProps) {
  if (!open) return null;

  const localDate = format(new Date(localUpdatedAt), 'MMM d, h:mm a');
  const serverDate = format(new Date(serverUpdatedAt), 'MMM d, h:mm a');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[var(--overlay-mask)]"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="relative bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl shadow-2xl w-[95vw] max-w-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 px-6 py-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                Resolve Conflict
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                This deck has been modified on another device. Choose which version to keep.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Side-by-side comparison */}
          <div className="p-6 flex gap-4">
            <VersionCard
              label="Your Version (Local)"
              color="emerald"
              date={localDate}
              summary={localSummary}
            />
            <VersionCard
              label="Server Version"
              color="blue"
              date={serverDate}
              summary={serverSummary}
            />
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => { onSaveAsNew(); onClose(); }}
              className="px-4 py-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50"
            >
              <Copy className="w-4 h-4 mr-2" />
              Save Local as New
            </Button>
            <Button
              variant="ghost"
              onClick={() => { onKeepMine(); onClose(); }}
              className="px-4 py-2 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30"
            >
              <FileText className="w-4 h-4 mr-2" />
              Keep Local
            </Button>
            <Button
              onClick={() => { onAcceptServer(); onClose(); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Accept Server
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
