// components/modern/FloatingActionButton.tsx
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function FloatingActionButton({ 
  onClick, 
  icon = <Plus className="h-6 w-6" />, 
  className 
}: FloatingActionButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        'fixed bottom-8 right-8 z-50',
        'w-16 h-16 rounded-full',
        'gradient-primary text-white',
        'shadow-strong hover:shadow-[0_20px_50px_rgba(102,126,234,0.5)]',
        'flex items-center justify-center',
        'transition-shadow duration-300',
        className
      )}
    >
      {icon}
    </motion.button>
  );
}
