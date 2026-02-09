'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

type DoodleVariant = 
  | 'arrow-right-curved' 
  | 'arrow-left-curved'
  | 'underline-wavy' 
  | 'circle-messy'
  | 'sparkle'
  | 'highlight-box'
  | 'brain'
  | 'bulb';

interface DoodleProps {
  variant: DoodleVariant;
  color?: string;
  className?: string; // For positioning and specialized sizing
  delay?: number;
  duration?: number;
}

const draw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => {
    const delay = i; // dynamic delay based on prop if needed
    return {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay, type: "spring", duration: 1.5, bounce: 0 },
        opacity: { delay, duration: 0.01 }
      }
    };
  }
};

export function Doodle({ variant, color = "text-yellow-400", className, delay = 0, duration = 1 }: DoodleProps) {
  
  const renderPath = () => {
    switch (variant) {
      case 'arrow-right-curved':
        return (
          <motion.path
            d="M10 50 Q 50 10, 90 50 T 150 50 M 140 35 L 150 50 L 135 60"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={draw}
            custom={delay}
          />
        );
      case 'arrow-left-curved':
         return (
            <motion.path
                d="M150 50 Q 110 10, 70 50 T 10 50 M 20 35 L 10 50 L 25 60"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="3"
                 strokeLinecap="round"
                strokeLinejoin="round"
                variants={draw}
                custom={delay}
            />
         );
      case 'underline-wavy':
        return (
          <motion.path
            d="M5 25 Q 20 10, 35 25 T 65 25 T 95 25 T 125 25"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            variants={draw}
            custom={delay}
          />
        );
      case 'circle-messy':
        return (
          <motion.path
            d="M50 10 C 20 10, 10 30, 10 50 C 10 70, 30 90, 50 90 C 70 90, 90 70, 90 50 C 90 30, 70 10, 50 15"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            variants={draw}
            custom={delay}
          />
        );
       case 'sparkle':
         return (
             <motion.path
                d="M50 0 L 55 40 L 95 45 L 55 50 L 50 90 L 45 50 L 5 45 L 45 40 Z M 20 20 L 25 10 L 35 15 L 25 20 L 20 30 L 15 20 L 5 15 L 15 10 Z"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={draw}
                custom={delay}
             />
         );
       case 'brain':
            return (
                <motion.path
                   d="M25 50 C 25 30, 40 15, 60 15 C 70 15, 80 20, 80 30 C 80 20, 90 15, 100 15 C 120 15, 135 30, 135 50 C 135 65, 125 75, 110 80 C 120 90, 100 95, 90 85 C 80 95, 60 90, 70 75 C 50 85, 25 70, 25 50 Z M 45 40 Q 55 30, 65 40 M 95 40 Q 105 30, 115 40 M 80 30 L 80 80"
                   fill="transparent"
                   stroke="currentColor"
                   strokeWidth="2.5"
                   strokeLinecap="round"
                   strokeLinejoin="round"
                   variants={draw}
                   custom={delay}
                />
            );
        case 'bulb':
            return (
                <motion.path
                   d="M60 70 L 65 85 L 95 85 L 100 70 M 80 85 L 80 95 M 65 95 L 95 95 M 50 40 C 50 15, 110 15, 110 40 C 110 55, 100 60, 100 70 L 60 70 C 60 60, 50 55, 50 40 Z M 70 30 L 75 45 L 85 45 L 90 30"
                   fill="transparent"
                   stroke="currentColor"
                   strokeWidth="2.5"
                   strokeLinecap="round"
                   strokeLinejoin="round"
                   variants={draw}
                   custom={delay}
                />
            );
      default:
        return null;
    }
  };

  return (
    <motion.svg
      viewBox="0 0 160 100" // Standard viewBox, can receive override
      className={cn("pointer-events-none absolute w-24 h-24", color, className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {renderPath()}
    </motion.svg>
  );
}
