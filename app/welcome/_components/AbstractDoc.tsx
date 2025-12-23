'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Type, 
  Heading1, 
  Heading2, 
  List, 
  CheckSquare, 
  Image as ImageIcon, 
  MoreHorizontal,
  Bold,
  Italic,
  Underline
} from 'lucide-react';

export const AbstractDoc = () => {
  const [activeBlock, setActiveBlock] = useState(0);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Simulate typing flow
  useEffect(() => {
    const sequence = async () => {
      // Start
      await new Promise(r => setTimeout(r, 1000));
      setActiveBlock(1); // Title appear
      
      await new Promise(r => setTimeout(r, 800));
      setActiveBlock(2); // First paragraph
      
      await new Promise(r => setTimeout(r, 1500));
      setShowSlashMenu(true); // Trigger slash menu
      
      await new Promise(r => setTimeout(r, 2000));
      setShowSlashMenu(false);
      setActiveBlock(3); // Add list item
    };
    
    sequence();
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center p-8 lg:p-16">
      {/* Main Document Surface */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative w-full max-w-2xl aspect-[3/4] md:aspect-[4/3] bg-[#0F0F0F] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Window Controls / Header */}
        <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/30" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
          </div>
          <div className="ml-4 h-4 w-24 rounded-full bg-white/5" />
          <div className="ml-auto">
            <MoreHorizontal className="text-white/20 w-4 h-4" />
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-8 md:p-12 relative font-mono text-sm md:text-base space-y-6">
            
            {/* Title Block */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: activeBlock >= 1 ? 1 : 0, y: activeBlock >= 1 ? 0 : 10 }}
              className="group relative"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-white/90 mb-2">Project Nebula</h1>
              <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="p-1 rounded bg-white/5 text-white/40"><MoreHorizontal size={14}/></div>
              </div>
            </motion.div>

            {/* Paragraph Block */}
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: activeBlock >= 2 ? 1 : 0 }}
               className="text-[hsl(var(--muted-foreground))] leading-relaxed"
            >
              The goal is to create a unified interface for all knowledge work. We need to bridge the gap between unstructured thinking and structured documentation.
            </motion.div>

            {/* The "Active" Block with Slash Menu */}
            {(activeBlock >= 2) && (
             <div className="relative group">
                <div className="flex items-center gap-2">
                    {/* Cursor */}
                    {activeBlock < 3 && !showSlashMenu && (
                        <motion.div 
                            layoutId="cursor"
                            className="w-0.5 h-5 bg-blue-500"
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                        />
                    )}
                    
                    {/* Rendered List Item (after slash menu) */}
                    {activeBlock >= 3 && (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 text-white/80"
                        >
                            <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center">
                                <CheckSquare size={12} className="text-blue-500" />
                            </div>
                            <span>Integrate AI-driven insights</span>
                        </motion.div>
                    )}
                </div>

                {/* Slash Menu Popup */}
                <AnimatePresence>
                    {showSlashMenu && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            className="absolute top-8 left-0 w-64 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 flex flex-col"
                        >
                            <div className="px-3 py-2 text-xs font-medium text-white/40 uppercase tracking-wider">Basic Blocks</div>
                            <MenuItem icon={Type} label="Text" />
                            <MenuItem icon={Heading1} label="Heading 1" />
                            <MenuItem icon={Heading2} label="Heading 2" />
                            <MenuItem icon={List} label="Bullet List" />
                            <MenuItem icon={CheckSquare} label="To-do List" active />
                            <MenuItem icon={ImageIcon} label="Image" />
                        </motion.div>
                    )}
                </AnimatePresence>
             </div>
            )}
        </div>
        
        {/* Floating Toolbar Mockup (Bottom Right) */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 right-8 bg-[#1A1A1A]/80 backdrop-blur border border-white/10 rounded-full px-4 py-2 flex items-center gap-4 shadow-lg"
        >
            <div className="text-xs text-white/40">Markdown supported</div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex gap-2 text-white/60">
                <Bold size={14} />
                <Italic size={14} />
                <Underline size={14} />
            </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
    <div className={`flex items-center gap-3 px-3 py-2 mx-1 rounded-lg transition-colors ${active ? 'bg-blue-500/10 text-blue-400' : 'text-white/70 hover:bg-white/5'}`}>
        <Icon size={16} />
        <span className="text-sm">{label}</span>
    </div>
);
