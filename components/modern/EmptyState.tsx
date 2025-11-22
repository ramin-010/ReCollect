// components/modern/EmptyState.tsx
'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { GradientButton } from './GradientButton';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {icon && (
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mb-6 text-[hsl(var(--primary))]/20"
        >
          {icon}
        </motion.div>
      )}
      
      <h3 className="text-2xl font-bold mb-2 text-[hsl(var(--foreground))]">
        {title}
      </h3>
      
      <p className="text-[hsl(var(--muted-foreground))] max-w-md mb-6">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <GradientButton onClick={onAction}>
          {actionLabel}
        </GradientButton>
      )}
    </motion.div>
  );
}
