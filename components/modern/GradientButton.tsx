// components/modern/GradientButton.tsx
'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface GradientButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'danger';
  loading?: boolean;
  icon?: ReactNode;
}

export function GradientButton({
  children,
  className,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  ...props
}: GradientButtonProps) {
  const gradients = {
    primary: 'gradient-primary',
    success: 'gradient-success',
    danger: 'gradient-danger',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        gradients[variant],
        'relative overflow-hidden rounded-xl px-6 py-3 text-white font-medium',
        'shadow-medium hover:shadow-strong transition-all duration-300',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'flex items-center justify-center gap-2',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          {icon && <span className="flex items-center">{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
}
