'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui-base/Modal';
import { cn } from '@/lib/utils';
import { lx } from './styles';

interface LearningDialogProps {
  isOpen: boolean;
  /** Backdrop click, Esc and the X all call this (a dismiss: nothing is saved). */
  onClose: () => void;
  /** Tailwind max-width of the panel, e.g. 'max-w-3xl'. */
  width?: string;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** A soft gradient behind the header (Revise's `from-accent/10`). */
  headerTint?: 'primary' | 'purple' | 'blue' | 'none';
  footer?: React.ReactNode;
  /** Disable Esc/backdrop/X while saving. */
  busy?: boolean;
  bodyClassName?: string;
  children: React.ReactNode;
}

const TINTS = {
  primary: 'bg-gradient-to-r from-[hsl(var(--primary))]/10 to-transparent',
  purple: 'bg-gradient-to-r from-purple-500/10 to-transparent',
  blue: 'bg-gradient-to-r from-blue-500/10 to-transparent',
  none: '',
} as const;

/**
 * The dashboard's modal shell: ui-base Modal (portal, Esc, scroll lock) with Revise's
 * header / scrolling body / footer layout.
 */
export function LearningDialog({
  isOpen,
  onClose,
  width = 'max-w-2xl',
  icon,
  title,
  subtitle,
  headerTint = 'none',
  footer,
  busy = false,
  bodyClassName,
  children,
}: LearningDialogProps) {
  const dismiss = () => {
    if (!busy) onClose();
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={dismiss}
      showCloseButton={false}
      className={cn('border', lx.border, 'rounded-2xl bg-[hsl(var(--card))]', width)}
    >
      <div className="flex flex-col max-h-[90vh]">
        {(title || subtitle) && (
          <div className={cn('px-6 py-5 border-b flex items-start justify-between gap-4 shrink-0', lx.border, TINTS[headerTint])}>
            <div className="min-w-0">
              {title && (
                <h2 className={cn('text-lg font-semibold flex items-center gap-2', lx.fg)}>
                  {icon}
                  {title}
                </h2>
              )}
              {subtitle && <div className={cn('text-[13px] mt-1', lx.muted)}>{subtitle}</div>}
            </div>
            <button
              onClick={dismiss}
              disabled={busy}
              className={cn('p-2 -m-1 rounded-lg transition-colors disabled:opacity-50', lx.muted, 'hover:text-[hsl(var(--foreground))]', lx.hover)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className={cn('flex-1 min-h-0 overflow-y-auto custom-scrollbar', bodyClassName ?? 'p-6')}>{children}</div>
        {footer && <div className={cn('px-6 py-4 border-t shrink-0', lx.border)}>{footer}</div>}
      </div>
    </Modal>
  );
}
