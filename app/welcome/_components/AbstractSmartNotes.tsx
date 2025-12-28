'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { 
  FileText, 
  Image as ImageIcon, 
  Code, 
  Share2, 
  Plus,
  MoreHorizontal,
  MousePointer2,
  CheckCircle2,
  Users,
  Sparkles
} from 'lucide-react';

// --- COMPONENTS ---

const Cursor = ({ x, y, click }: any) => (
    <motion.div
        className="absolute z-50 pointer-events-none"
        animate={{ x, y }}
        transition={{ 
            type: "spring", 
            damping: 30, 
            stiffness: 200,
            restDelta: 0.001
        }}
    >
        <div className="relative">
            <MousePointer2 
                className={`w-6 h-6 ${click ? 'text-amber-400 scale-90' : 'text-zinc-100'} fill-current drop-shadow-2xl transition-all duration-150`} 
                strokeWidth={1}
            />
            {click && (
                <motion.div 
                    className="absolute -top-2 -left-2 w-10 h-10 bg-amber-400/30 rounded-full"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                />
            )}
        </div>
    </motion.div>
);

const NodeCard = ({ type, title, content, icon: Icon, color, scale = 1, isShared }: any) => (
    <div className={`
        relative overflow-hidden backdrop-blur-xl rounded-xl border transition-all duration-300
        ${type === 'root' ? 'w-64 bg-zinc-900/95 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : ''}
        ${type === 'text' ? 'w-48 bg-zinc-900/80 border-white/10' : ''}
        ${type === 'image' ? 'w-56 bg-zinc-900/80 border-white/10' : ''}
        ${isShared ? 'ring-2 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : ''}
    `}>
        {/* Header */}
        <div className={`px-4 py-3 border-b ${type === 'root' ? 'border-amber-500/10 bg-amber-500/5' : 'border-white/5'} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
                <Icon size={14} className={color} />
                <span className="text-xs font-semibold text-zinc-200">{title}</span>
            </div>
            {isShared && (
                <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] text-emerald-400 font-medium">
                    <Globe size={10} />
                    Shared
                </div>
            )}
            {!isShared && <MoreHorizontal size={14} className="text-zinc-600" />}
        </div>
        
        {/* Content */}
        <div className="p-4">
            {type === 'image' ? (
                <div className="h-24 bg-zinc-800 rounded-lg overflow-hidden relative group">
                     <img 
                        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400" 
                        className="w-full h-full object-cover opacity-80"
                        alt="moodboard" 
                     />
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full" />
                    <div className="h-1.5 w-[80%] bg-zinc-800 rounded-full" />
                    {type === 'root' && <div className="h-1.5 w-[90%] bg-zinc-800 rounded-full" />}
                </div>
            )}
        </div>
    </div>
);

const Connection = ({ start, end, active }: any) => {
    // Bezier curve
    const path = `M ${start.x} ${start.y} C ${start.x} ${start.y + 60}, ${end.x} ${end.y - 60}, ${end.x} ${end.y}`;

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
             <motion.path 
                d={path}
                fill="none"
                stroke={active ? "#f59e0b" : "#3f3f46"} // Zinc-700 to Amber
                strokeWidth={active ? 2 : 1.5}
                strokeDasharray={active ? "none" : "4 4"}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1 }}
             />
             {active && (
                 <motion.circle 
                    r="3"
                    fill="#f59e0b"
                    initial={{ offsetDistance: "0%" }}
                    animate={{ offsetDistance: "100%" }}
                    transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        ease: "linear",
                    }}
                    style={{ offsetPath: `path("${path}")` }}
                 />
             )}
        </svg>
    );
};

// Globe Icon fix
const Globe = ({ size }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
)

export const AbstractSmartNotes = () => {
    const [step, setStep] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(containerRef, { once: true, amount: 0.4 });

    // Scripted Sequence
    useEffect(() => {
        if (isInView) {
            const schedule = [
                { t: 0, s: 0 }, // Initial Root
                { t: 1000, s: 1 }, // Move Cursor to Root Handle
                { t: 1500, s: 2 }, // Drag Out
                { t: 2500, s: 3 }, // Spawn Child 1 (Analysis)
                { t: 3500, s: 4 }, // Move Cursor to Root Handle 2
                { t: 4000, s: 5 }, // Drag Out 2
                { t: 5000, s: 6 }, // Spawn Child 2 (Image)
                { t: 6000, s: 7 }, // Move Cursor to Share
                { t: 6500, s: 8 }, // Click Share -> Pulse
            ];

            const timers = schedule.map(({ t, s }) => setTimeout(() => setStep(s), t));
            return () => timers.forEach(clearTimeout);
        }
    }, [isInView]);

    // Positions
    const ROOT = { x: 300, y: 150 };
    const CHILD_1 = { x: 150, y: 350 };
    const CHILD_2 = { x: 450, y: 350 };
    
    // Cursor State Logic
    const getCursorPos = () => {
        switch(step) {
            case 0: return { x: 350, y: 400 }; // Start
            case 1: return { x: ROOT.x, y: ROOT.y + 60 }; // Hover Root Bottom
            case 2: return { x: CHILD_1.x, y: CHILD_1.y - 50 }; // Dragging to Child 1
            case 3: return { x: CHILD_1.x + 50, y: CHILD_1.y + 50 }; // Resting
            case 4: return { x: ROOT.x, y: ROOT.y + 60 }; // Back to Root
            case 5: return { x: CHILD_2.x, y: CHILD_2.y - 50 }; // Dragging to Child 2
            case 6: return { x: CHILD_2.x + 50, y: CHILD_2.y + 50 }; // Resting
            case 7: return { x: ROOT.x + 100, y: ROOT.y - 40 }; // Hover Share (Mock position top right of root)
            case 8: return { x: ROOT.x + 100, y: ROOT.y - 40 }; // Click Share
            default: return { x: 350, y: 400 };
        }
    };
    
    const isClicking = step === 8;
    const cursorPos = getCursorPos();

    return (
        <div ref={containerRef} className="relative w-full h-full min-h-[500px] flex items-center justify-center overflow-hidden bg-[#0A0A0A]">
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
            <div 
                className="absolute inset-0 opacity-10" 
                style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
            />

            {/* Canvas Container */}
            <div className="relative w-[600px] h-[500px]">
                
                {/* --- CONNECTIONS --- */}
                {step >= 2 && <Connection start={{x: 300, y: 220}} end={{x: 150, y: 350}} active={step >= 3} />}
                {step >= 5 && <Connection start={{x: 300, y: 220}} end={{x: 450, y: 350}} active={step >= 6} />}

                {/* --- CURSOR --- */}
                <Cursor x={cursorPos.x} y={cursorPos.y} click={isClicking} />

                {/* --- NODES --- */}
                
                {/* 1. ROOT NODE */}
                <motion.div 
                    className="absolute"
                    style={{ left: ROOT.x, top: ROOT.y, x: '-50%', y: '-50%' }}
                    initial={{ opacity: 0, scale: 0.8, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <NodeCard 
                        type="root" 
                        title="Project Phoenix: Q3" 
                        icon={Sparkles} 
                        color="text-amber-500"
                        isShared={step >= 8}
                    />
                    {/* Share Button Mock */}
                    <div className="absolute -top-10 -right-2">
                         <AnimatePresence>
                             {step >= 8 && (
                                <motion.div 
                                    className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-full shadow-lg flex items-center gap-1"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <CheckCircle2 size={10} /> Link Shared
                                </motion.div>
                             )}
                         </AnimatePresence>
                    </div>
                </motion.div>

                {/* 2. CHILD: ANALYSIS */}
                <AnimatePresence>
                    {step >= 3 && (
                        <motion.div 
                            className="absolute"
                            style={{ left: CHILD_1.x, top: CHILD_1.y, x: '-50%', y: '-50%' }}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        >
                            <NodeCard type="text" title="Market Analysis" icon={FileText} color="text-blue-400" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 3. CHILD: MOODBOARD */}
                <AnimatePresence>
                    {step >= 6 && (
                        <motion.div 
                            className="absolute"
                            style={{ left: CHILD_2.x, top: CHILD_2.y, x: '-50%', y: '-50%' }}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        >
                            <NodeCard type="image" title="Visual Assets" icon={ImageIcon} color="text-purple-400" />
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};
