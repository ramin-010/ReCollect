'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const AbstractGraph = () => {
  const nodes = [
    { x: 50, y: 50, size: 12, color: '#f59e0b' },     // core
    { x: 20, y: 30, size: 8, color: '#fbbf24' },
    { x: 80, y: 20, size: 10, color: '#fbbf24' },
    { x: 85, y: 60, size: 6, color: '#fbbf24' },
    { x: 40, y: 80, size: 9, color: '#fbbf24' },
    { x: 10, y: 70, size: 7, color: '#fbbf24' },
  ];

  // Connections between nodes (indices)
  const connections = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], 
    [1, 5], [2, 3], [4, 5]
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center p-8">
      <div className="relative w-full max-w-sm aspect-square">
        <svg className="absolute inset-0 w-full h-full overflow-visible">
          {connections.map(([start, end], i) => (
            <motion.line
              key={`conn-${i}`}
              x1={`${nodes[start].x}%`}
              y1={`${nodes[start].y}%`}
              x2={`${nodes[end].x}%`}
              y2={`${nodes[end].y}%`}
              stroke="rgba(245, 158, 11, 0.3)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: i * 0.1, ease: "easeInOut", repeat: Infinity, repeatType: 'reverse', repeatDelay: 1 }}
            />
          ))}
          {/* Active Pulse Line */}
           <motion.circle
              cx={`${nodes[0].x}%`}
              cy={`${nodes[0].y}%`}
              r="4"
              fill="#fff"
           >
              <motion.animateMotion 
                 dur="3s" 
                 repeatCount="indefinite"
                 path={`M 0 0 L ${nodes[2].x - nodes[0].x} ${nodes[2].y - nodes[0].y}`}
              />
           </motion.circle>
        </svg>

        {nodes.map((node, i) => (
          <motion.div
            key={`node-${i}`}
            className="absolute rounded-full shadow-lg"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: node.size * 2,
              height: node.size * 2,
              backgroundColor: node.color,
              x: '-50%',
              y: '-50%',
              boxShadow: `0 0 20px ${node.color}50`
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
               type: "spring", 
               stiffness: 200, 
               damping: 15, 
               delay: i * 0.1 + 0.5 
            }}
          >
             {i === 0 && (
                <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 bg-zinc-900/90 border border-amber-500/20 rounded-lg text-amber-200 text-xs font-medium">
                   Project: ReCollect
                </div>
             )}
          </motion.div>
        ))}
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/50 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};
