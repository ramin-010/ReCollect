'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlideInbox, SlideComposer, SlideThread } from './EmailMockup';

export function LandingEmailViewer() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="w-full  h-full flex flex-col overflow-hidden pointer-events-none select-none"
      // Force Tailwind CSS variables to an Apple-inspired Neutral Dark Mode (Strictly No Color Tint)
      style={{
        '--background': '0 0% 15%',       // #262626 (Slightly lighter neutral dark background)
        '--foreground': '0 0% 100%',      // #FFFFFF (Pure crisp white text)
        '--card': '0 0% 20%',             // #333333 (Elevated cards)
        '--border': '0 0% 26%',           // #424242 (Subtle borders)
        '--muted': '0 0% 23%',            // #3B3B3B (Muted surfaces)
        '--muted-foreground': '0 0% 85%', // #D9D9D9 (Bright crisp gray, ensuring text never looks faded)
      } as React.CSSProperties}
    >
      <div className="flex-1 bg-[hsl(var(--background))] overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            className="absolute inset-0"
          >
            {activeSlide === 0 && <SlideInbox />}
            {activeSlide === 1 && <SlideComposer />}
            {activeSlide === 2 && <SlideThread />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide indicators seamlessly integrated at the bottom */}
      <div className="shrink-0 flex items-center justify-center gap-2 py-4 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === activeSlide
                ? 'w-5 h-1.5 bg-blue-500'
                : 'w-1.5 h-1.5 bg-[hsl(var(--muted-foreground))]/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
