'use client';

import { Card } from '@/components/ui-base/Card';

export function ContentCardSkeleton() {
  return (
    <Card className="h-full flex flex-col min-h-[450px] gap-0 overflow-hidden border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] rounded-2xl">
      {/* Header Section */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Title Skeleton */}
            <div className="h-7 w-3/4 bg-[hsl(var(--muted))]/40 rounded-lg overflow-hidden relative">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            
            {/* Meta Skeleton */}
            <div className="flex items-center gap-3 mt-2">
              <div className="h-5 w-20 bg-[hsl(var(--muted))]/30 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.1s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              <div className="h-4 w-24 bg-[hsl(var(--muted))]/30 rounded overflow-hidden relative">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.2s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>
          </div>
          
          {/* Menu Button Skeleton */}
          <div className="h-8 w-8 bg-[hsl(var(--muted))]/30 rounded-lg overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.15s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </div>
      </div>

      {/* Description Skeleton */}
      <div className="px-4 pb-4 space-y-2">
        <div className="h-3 w-full bg-[hsl(var(--muted))]/30 rounded overflow-hidden relative">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.3s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <div className="h-3 w-2/3 bg-[hsl(var(--muted))]/30 rounded overflow-hidden relative">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.35s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>

      {/* Preview Section Skeleton */}
      <div className="px-4 flex-1 min-h-0 flex flex-col pb-4">
        <div className="flex-1 w-full bg-[hsl(var(--muted))]/20 rounded-xl border border-[hsl(var(--border))]/30 overflow-hidden relative">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite_0.4s] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </div>
      </div>

      {/* Footer Section */}
      <div className="p-4 mt-auto space-y-4 bg-gradient-to-b from-transparent to-[hsl(var(--muted))]/5">
        {/* Tags Skeleton */}
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-[hsl(var(--muted))]/30 rounded-md overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.5s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="h-6 w-20 bg-[hsl(var(--muted))]/30 rounded-md overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.55s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="h-6 w-14 bg-[hsl(var(--muted))]/30 rounded-md overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.6s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </div>

        {/* Links Skeleton */}
        <div className="pt-3 border-t border-[hsl(var(--border))]/40 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-[hsl(var(--muted))]/30 rounded-md overflow-hidden relative">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.65s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div className="h-3 w-1/2 bg-[hsl(var(--muted))]/30 rounded overflow-hidden relative">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.7s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-[hsl(var(--muted))]/30 rounded-md overflow-hidden relative">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.75s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div className="h-3 w-1/3 bg-[hsl(var(--muted))]/30 rounded overflow-hidden relative">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.8s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </Card>
  );
}