'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Brain, 
  Fingerprint, 
  Sparkles, 
  Zap, 
  Cpu, 
  Network, 
  Blocks,
  Puzzle,
  Lightbulb,
  Share2
} from 'lucide-react';

// "Absurd/Futuristic" collage using icons + shapes.
// Represents: Diversity of thought, interconnectedness, innovation.

const shapes = [
  // Centerpiece
  { id: 1, icon: Brain, size: 48, x: 50, y: 50, rotate: 0, color: "text-white", bg: "bg-indigo-500/20" },
  
  // Floating elements
  { id: 2, icon: Fingerprint, size: 32, x: 20, y: 30, rotate: -15, color: "text-blue-400", delay: 0 },
  { id: 3, icon: Sparkles, size: 24, x: 80, y: 20, rotate: 15, color: "text-amber-400", delay: 0.1 },
  { id: 4, icon: Zap, size: 28, x: 85, y: 70, rotate: 10, color: "text-yellow-400", delay: 0.2 },
  { id: 5, icon: Network, size: 36, x: 15, y: 75, rotate: -5, color: "text-emerald-400", delay: 0.3 },
  
  // Tiny accents
  { id: 6, icon: Cpu, size: 20, x: 40, y: 15, rotate: 45, color: "text-purple-400/50", delay: 0.4 },
  { id: 7, icon: Blocks, size: 22, x: 60, y: 85, rotate: -10, color: "text-pink-400/50", delay: 0.5 },
];

export function AbstractShapes({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-64 h-32 mx-auto mb-6 select-none", className)}>
      {/* Background Blobs (Abstract Ink) */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 200 100">
        <path d="M40 50 Q 60 20 90 50 T 150 50" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10" />
        <circle cx="100" cy="50" r="40" fill="currentColor" className="text-blue-500/5" />
        <circle cx="140" cy="30" r="20" fill="currentColor" className="text-purple-500/5" />
      </svg>

      {/* Shapes Layer */}
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className={cn(
            "absolute flex items-center justify-center rounded-2xl backdrop-blur-sm border border-white/5",
            shape.bg
          )}
          style={{ 
             left: `${shape.x}%`, 
             top: `${shape.y}%`,
             width: shape.size + 16,
             height: shape.size + 16,
             marginLeft: -(shape.size + 16)/2,
             marginTop: -(shape.size + 16)/2
          }}
          initial={{ opacity: 0, scale: 0, rotate: shape.rotate - 45 }}
          animate={{ opacity: 1, scale: 1, rotate: shape.rotate }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15, 
            delay: (shape.delay || 0) + 0.2
          }}
          whileHover={{ 
            scale: 1.1, 
            rotate: shape.rotate + 10,
            zIndex: 10
          }}
        >
          <shape.icon 
            size={shape.size} 
            className={cn("stroke-[1.5]", shape.color)} 
          />
        </motion.div>
      ))}
    </div>
  );
}
