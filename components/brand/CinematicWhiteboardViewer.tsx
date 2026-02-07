'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MousePointer2, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// Cursor Component
const Cursor = ({ color, name, x, y, delay }: { color: string, name: string, x: string, y: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: 0, y: 0 }}
    animate={{ 
      opacity: [0, 1, 1, 0],
      x: x,
      y: y
    }}
    transition={{ 
      duration: 4,
      delay: delay,
      repeat: Infinity,
      repeatDelay: 2
    }}
    className={cn("absolute z-20 pointer-events-none", color)}
  >
    <MousePointer2 className="w-5 h-5 fill-current" />
    <div className={cn("ml-4 px-2 py-0.5 rounded-md text-[10px] font-bold text-white whitespace-nowrap", color.replace('text-', 'bg-'))}>
      {name}
    </div>
  </motion.div>
);

// Shape Component (Rectangle)
const AnimatedRect = ({ x, y, width, height, delay, color = "stroke-white" }: any) => (
  <motion.rect
    x={x} y={y} width={width} height={height} rx="8"
    fill="transparent"
    strokeWidth="2"
    strokeDasharray="10 10" // Rough sketch style
    className={color}
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: 1, opacity: 1 }}
    transition={{ duration: 1.5, delay: delay, ease: "easeInOut" }}
  />
);

// Connector Line
const AnimatedConnector = ({ d, delay, color = "stroke-gray-500" }: any) => (
  <motion.path
    d={d}
    fill="transparent"
    strokeWidth="2"
    className={color}
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: 1, opacity: 1 }}
    transition={{ duration: 1, delay: delay, ease: "linear" }}
  />
);

export function CinematicWhiteboardViewer() {
  return (
    <div className="w-full max-w-2xl mx-auto relative perspective-1000">
      {/* 3D Tilted Container for Depth */}
      <motion.div 
        initial={{ rotateX: 10, rotateY: -10, scale: 0.9 }}
        whileHover={{ rotateX: 0, rotateY: 0, scale: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="relative aspect-video w-full bg-[#121212] rounded-xl border border-white/10 shadow-2xl overflow-hidden group"
      >
        {/* Dot Grid Background */}
        <div className="absolute inset-0 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        {/* UI Overlay: "Live" Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full z-30">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-green-500">LIVE SYNC</span>
        </div>

        {/* UI Overlay: Latency */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full z-30">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-xs font-mono text-gray-400">12ms</span>
        </div>

        {/* --- Canvas Content (SVG) --- */}
        <svg className="absolute inset-0 w-full h-full p-12" viewBox="0 0 600 400">
            {/* 1. Database Node */}
            <AnimatedRect x="50" y="150" width="100" height="60" delay={0.5} color="stroke-blue-400" />
            <motion.text 
                x="100" y="185" textAnchor="middle" fill="white" fontSize="12" fontFamily="monospace"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            >
                Postgres
            </motion.text>

            {/* Connection 1 */}
            <AnimatedConnector d="M150 180 L 250 180" delay={1.5} />

            {/* 2. API Server Node */}
            <AnimatedRect x="250" y="140" width="120" height="80" delay={2} color="stroke-emerald-400" />
            <motion.text 
                x="310" y="185" textAnchor="middle" fill="white" fontSize="12" fontFamily="monospace"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
            >
                API Server
            </motion.text>

            {/* Connection 2 (Branching) */}
            <AnimatedConnector d="M370 180 L 450 120" delay={3} />
            <AnimatedConnector d="M370 180 L 450 240" delay={3.2} />

            {/* 3. Clients */}
            <AnimatedRect x="450" y="90" width="100" height="60" delay={3.5} color="stroke-purple-400" />
            <motion.text 
                x="500" y="125" textAnchor="middle" fill="white" fontSize="12" fontFamily="monospace"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4 }}
            >
                Web Client
            </motion.text>

            <AnimatedRect x="450" y="210" width="100" height="60" delay={3.8} color="stroke-pink-400" />
            <motion.text 
                x="500" y="245" textAnchor="middle" fill="white" fontSize="12" fontFamily="monospace"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.3 }}
            >
                Mobile App
            </motion.text>
        </svg>

        {/* --- Cursors Simulating Users --- */}
        <Cursor color="text-amber-400" name="You" x="100%" y="100%" delay={0} /> {/* Drawn off screen or start pos */}
        <motion.div
             initial={{ x: 50, y: 300, opacity: 0 }}
             animate={{ x: [50, 150, 250, 310], y: [300, 180, 140, 200], opacity: [0, 1, 1, 0] }}
             transition={{ duration: 4, delay: 0.2, repeat: Infinity, repeatDelay: 2 }}
             className="absolute z-20 pointer-events-none text-blue-400"
        >
             <MousePointer2 className="w-5 h-5 fill-current" />
             <div className="ml-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500 text-white whitespace-nowrap">
                Ramin
             </div>
        </motion.div>

        <motion.div
             initial={{ x: 500, y: 50, opacity: 0 }}
             animate={{ x: [500, 450, 300], y: [50, 120, 180], opacity: [0, 1, 1, 0] }}
             transition={{ duration: 4, delay: 1.5, repeat: Infinity, repeatDelay: 2 }}
             className="absolute z-20 pointer-events-none text-rose-400"
        >
             <MousePointer2 className="w-5 h-5 fill-current" />
             <div className="ml-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white whitespace-nowrap">
                Sarah
             </div>
        </motion.div>

      </motion.div>

      {/* Floating Elements Background - decorative */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -z-10 animate-pulse" />
    </div>
  );
}
