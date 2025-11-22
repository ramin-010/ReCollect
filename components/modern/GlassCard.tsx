// components/modern/GlassCard.tsx
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}

export function GlassCard({ children, className, hover = true, gradient = false }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={hover ? { y: -4, scale: 1.02 } : {}}
      className={cn(
        'glass-card rounded-2xl p-6',
        hover && 'hover-lift cursor-pointer',
        gradient && 'border-t-2 border-t-primary',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
