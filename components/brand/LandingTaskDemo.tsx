'use client';

import React from 'react';
import { TaskInput } from '@/components/todo/task_Input';
import { Sparkles } from 'lucide-react';
import { Caveat } from 'next/font/google';

const caveat = Caveat({ subsets: ['latin'], weight: ['400', '700'] });

export function LandingTaskDemo() {
  return (
    <div className="w-full max-w-[1400px] mx-auto py-10 relative flex items-center justify-center min-h-[500px]">
        {/* Connecting Lines (SVG) - Faded & Subtle */}
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
            <svg className="w-full h-full visible overflow-visible" viewBox="0 0 1400 500" preserveAspectRatio="none">
                 <defs>
                    <linearGradient id="gradient-line-left" x1="100%" y1="0%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
                        <stop offset="50%" stopColor="rgba(255, 255, 255, 0.4)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                    </linearGradient>
                    <linearGradient id="gradient-line-right" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
                        <stop offset="50%" stopColor="rgba(255, 255, 255, 0.4)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                    </linearGradient>
                </defs>

                 {/* Left Connections - Consistent & Symmetric */}
                <path d="M 60 50 Q 350 250, 600 250" fill="none" stroke="url(#gradient-line-left)" strokeWidth="1.5" strokeDasharray="6 4" className="opacity-60" />
                <circle cx="60" cy="50" r="3" className="fill-emerald-400/50" />
                
                <path d="M 60 450 Q 350 250, 600 250" fill="none" stroke="url(#gradient-line-left)" strokeWidth="1.5" strokeDasharray="6 4" className="opacity-60" />
                {/* <circle cx="60" cy="450" r="3" className="fill-blue-400/50" /> */}

                {/* Right Connections - Consistent & Symmetric */}
                <path d="M 1340 50 Q 1050 250, 800 250" fill="none" stroke="url(#gradient-line-right)" strokeWidth="1.5" strokeDasharray="6 4" className="opacity-60" />
                <circle cx="1340" cy="50" r="3" className="fill-purple-400/50" />

                <path d="M 1340 450 Q 1050 250, 800 250" fill="none" stroke="url(#gradient-line-right)" strokeWidth="1.5" strokeDasharray="6 4" className="opacity-60" />
                {/* <circle cx="1340" cy="450" r="3" className="fill-amber-400/50" /> */}
            </svg>
        </div>

        {/* Feature Text Nodes - "Integrated Feature Text" */}
        <div className={`absolute inset-0 z-10 pointer-events-none px-4 ${caveat.className}`}>
             <div className="w-full h-full max-w-[1400px] mx-auto relative">
                
                {/* 1. Second Brain (Top Left) */}
                <div className="absolute top-[4%] left-[2%] sm:left-[-10%] max-w-[280px] text-right sm:text-left transform -rotate-2 opacity-60 hover:opacity-100 transition-opacity duration-500">
                    <h3 className="text-xl sm:text-2xl text-emerald-300/80 mb-1 font-bold">Your Second Brain</h3>
                    <p className="text-lg sm:text-xl text-white/50 leading-tight">
                        Keeps all your tasks, reminders, and workflows in check without the chaos.
                    </p>
                </div>

                {/* 2. Context Integration (Top Right) */}
                <div className="absolute top-[4%] right-[2%] sm:right-[-10%] max-w-[280px] text-left sm:text-right transform rotate-2 opacity-60 hover:opacity-100 transition-opacity duration-500">
                     <h3 className="text-xl sm:text-2xl text-purple-300/80 mb-1 font-bold">Deep Integration</h3>
                    <p className="text-lg sm:text-xl text-white/50 leading-tight">
                        Manage tasks specifically for Docs, Whiteboards & Notes right where you work.
                    </p>
                </div>

                {/* 3. Collaboration (Bottom Left) */}
                <div className="absolute bottom-[4%] left-[2%] sm:left-[-10%] max-w-[280px] text-right sm:text-left transform rotate-1 opacity-60 hover:opacity-100 transition-opacity duration-500">
                    <h3 className="text-xl sm:text-2xl text-blue-300/80 mb-1 font-bold">Healthy Collaboration</h3>
                    <p className="text-lg sm:text-xl text-white/50 leading-tight">
                        Assign tasks and sync with your team instantly for smoother workflows.
                    </p>
                </div>

                {/* 4. Smart Reminders (Bottom Right) */}
                <div className="absolute bottom-[4%] right-[2%] sm:right-[-10%] max-w-[280px] text-left sm:text-right transform -rotate-1 opacity-60 hover:opacity-100 transition-opacity duration-500">
                     <h3 className="text-xl sm:text-2xl text-amber-300/80 mb-1 font-bold">Smart Timing</h3>
                    <p className="text-lg sm:text-xl text-white/50 leading-tight">
                        Intelligent 10-min before reminders ensure you never miss a beat.
                    </p>
                </div>

             </div>
        </div>

        {/* Real TaskInput Component (Center) */}
        <div className="relative z-20 w-full max-w-[680px] mx-6 transform shadow-2xl rounded-xl ring-1 ring-white/10 group">
          
          {/* Subtle Glow Effect behind input */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 rounded-xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
          
          <div className="relative bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl">
             <TaskInput 
                isExpanded={true}
                onExpandChange={() => {}}
                onSave={() => {}} 
                onClose={() => {}}
                isQuickAdd={false}
                demoMode={true}
                initialTitle="Review Q3 Roadmap with Design Team @design"
                initialDescription={`<div class="img-container" contenteditable="false" style="position: relative; display: block; width: fit-content; margin: 8px 0;">
                </div><p>Let's finalize the new dashboard layout and component system.</p>`}
              />
          </div>

          {/* Connected Context Badge */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-white/40">
             <Sparkles className="w-3 h-3 text-amber-400/70" />
             <span className={`${caveat.className} text-lg tracking-wide`}>Connected to your workflow</span>
          </div>
        </div>
    </div>
  );
}
