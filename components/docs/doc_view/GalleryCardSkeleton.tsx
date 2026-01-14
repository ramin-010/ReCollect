'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Enhanced skeleton loader that matches the GalleryCard layout
 * Features: shimmer effect via Tailwind, staggered animations
 */
export const GalleryCardSkeleton = ({ index = 0 }: { index?: number }) => {
  return (
    <motion.div 
      className="relative h-[280px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <div
        className="h-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/40 
                   shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden"
      >
        {/* Cover Section Skeleton with Shimmer */}
        <div className="h-[35%] relative w-full overflow-hidden">
          <div className="absolute inset-0 bg-[hsl(var(--muted))] animate-pulse" />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[hsl(var(--card))] to-transparent opacity-50" />
        </div>

        {/* Content Section Skeleton */}
        <div className="flex-1 px-4 pt-3 pb-2 flex flex-col justify-between bg-gradient-to-b from-[hsl(var(--sidebar-bg))] to-[hsl(var(--card))]">
          <div className="flex flex-col gap-3">
            {/* Title Skeleton */}
            <div className="h-6 w-3/4 rounded-md bg-[hsl(var(--muted))] animate-pulse" />

            {/* Preview Content Skeleton - 3 lines with varying widths */}
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="h-3 w-full rounded bg-[hsl(var(--muted))]/70 animate-pulse" />
              <div className="h-3 w-[85%] rounded bg-[hsl(var(--muted))]/70 animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="h-3 w-[65%] rounded bg-[hsl(var(--muted))]/70 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>

          {/* Footer Meta Skeleton */}
          <div className="flex items-center justify-between pt-3 mt-auto border-t border-[hsl(var(--border))]/60">
            {/* Date skeleton */}
            <div className="h-3 w-14 rounded bg-[hsl(var(--muted))]/70 animate-pulse" />
            
            {/* Badge skeleton */}
            <div className="h-6 w-16 rounded-full bg-[hsl(var(--muted))]/70 animate-pulse" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Grid of skeleton cards for loading state with staggered entrance
 */
export const GallerySkeletonGrid = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <GalleryCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
};

export default GalleryCardSkeleton;
