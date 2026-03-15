'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Enhanced skeleton loader that matches the SlideCard layout
 * Features: shimmer effect via Tailwind, staggered animations
 */
export const SlideCardSkeleton = ({ index = 0 }: { index?: number }) => {
  return (
    <motion.div 
      className="group h-full p-3 flex flex-col min-h-[400px] gap-0 overflow-hidden border border-[hsl(var(--border))]/60 bg-[hsl(var(--card-bg))]/50 rounded-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <div className="relative h-[250px] w-full rounded-xl overflow-hidden bg-[hsl(var(--muted))] border border-white/5 shadow-inner flex shrink-0">
        <div className="absolute inset-0 bg-[hsl(var(--muted-foreground))]/10 animate-pulse" />
      </div>

      <div className="flex flex-col flex-1 p-4 px-4 gap-2">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-3 mb-1 mt-1">
          <div className="h-6 w-3/4 rounded-md bg-[hsl(var(--muted))] animate-pulse" />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer Row */}
        <div className="flex items-center justify-between pt-2 gap-2 border-t border-[hsl(var(--border))]/30 mt-auto">
          {/* Left Side Meta */}
          <div className="flex items-center gap-3">
             <div className="h-4 w-12 rounded bg-[hsl(var(--muted))] animate-pulse" />
             <div className="w-1 h-1 rounded-full bg-[hsl(var(--muted-foreground))]/40" />
             <div className="h-4 w-16 rounded bg-[hsl(var(--muted))] animate-pulse" />
          </div>
          
          {/* Badge Skeleton */}
          <div className="h-6 w-16 rounded-full bg-[hsl(var(--muted))] animate-pulse ml-auto" />
        </div>
      </div>
    </motion.div>
  );
};

export const SlideSkeletonGrid = ({ count = 4 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SlideCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
};
