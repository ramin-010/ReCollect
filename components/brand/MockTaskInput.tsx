'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Calendar, Bell, Flag, Tag, Check, Circle, UserPlus, Paperclip, MoreHorizontal, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-base/Button';

export function MockTaskInput() {
  const [phase, setPhase] = useState<'initial' | 'typing' | 'generating' | 'done'>('initial');
  const [typedText, setTypedText] = useState('');
  
  // Shorter, more readable prompt per user's request
  const aiPrompt = "@ai Tell @Ramin to review the new auth flow before tomorrow";

  const renderTypedText = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part === '@ai') {
        return (
          <span key={i} className="text-indigo-300 bg-indigo-500/20 px-1 py-0.5 rounded-md font-semibold text-[14px] mr-1 align-baseline">
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        // Prevent thin pill glitching for incomplete tags like `@a` while typing
        if (part.length <= 2) {
           return <span key={i} className="opacity-90 tracking-wide text-white">{part}</span>;
        }
        return (
          <span key={i} className="text-indigo-300 font-medium bg-indigo-500/15 px-[3px] py-[1px] rounded-[4px] border border-indigo-400/10 inline-block align-baseline leading-none">
            {part}
          </span>
        );
      }
      return <span key={i} className="opacity-90 tracking-wide">{part}</span>;
    });
  };

  useEffect(() => {
    let isActive = true;
    let currentTimeout: NodeJS.Timeout | null = null;
    
    // Safely wrapped delay promise
    const delay = (ms: number) => new Promise<void>(resolve => {
      if (!isActive) return;
      currentTimeout = setTimeout(() => {
        if (isActive) resolve();
      }, ms);
    });

    const runSequence = async () => {
      while (isActive) {
        setPhase('initial');
        setTypedText('');
        
        await delay(2000);
        if (!isActive) break;

        setPhase('typing');
        
        // Ensure prompt logic is safely matched from source
        const atAi = "@ai ";
        const promptRem = aiPrompt.replace('@ai ', '') || "Tell @Ramin to review the new auth flow before tomorrow";
        
        // 1. Type "@ai " exactly and safely
        for (let i = 1; i <= atAi.length; i++) {
          if (!isActive) return;
          setTypedText(atAi.slice(0, i));
          await delay(150); // Intentionally slower
        }

        // 2. Pause so transition is perfectly visible
        await delay(700);
        if (!isActive) break;

        // 3. Type rest of the prompt completely flawlessly
        for (let i = 1; i <= promptRem.length; i++) {
          if (!isActive) return;
          setTypedText(atAi + promptRem.slice(0, i));
          await delay(45); 
        }

        await delay(600);
        if (!isActive) break;

        setPhase('generating');
        await delay(2800);
        if (!isActive) break;

        setPhase('done');
        await delay(5000);
        if (!isActive) break;
      }
    };

    runSequence();

    return () => {
      isActive = false;
      if (currentTimeout) clearTimeout(currentTimeout);
    };
  }, [aiPrompt]);

  const isInitial = phase === 'initial';
  const isTyping = phase === 'typing';
  const isGenerating = phase === 'generating';
  const isDone = phase === 'done';
  const isAiMode = isTyping || isGenerating;

  const borderColor = isGenerating 
    ? "rgba(99, 102, 241, 0.4)" 
    : isAiMode 
      ? "rgba(99, 102, 241, 0.2)" 
      : "rgba(255,255,255,0.2)";

  const shadow = isGenerating 
    ? "0 0 25px -5px rgba(99, 102, 241, 0.25)" 
    : isAiMode 
      ? "0 0 25px -5px rgba(99, 102, 241, 0.15)" 
      : "0 10px 30px -5px rgba(0,0,0,0.3)";

  return (
    <div className="w-full items-start select-none text-left font-sans">
      <motion.div 
        animate={{ borderColor, boxShadow: shadow }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative bg-[#2a2a2a] rounded-xl border transition-colors duration-200 overflow-hidden text-left", 
          isAiMode && !isGenerating && "bg-[#262938] border-indigo-500/10"
        )}
      >
        {isGenerating && (
          <div className="flex items-center gap-2 px-6 pt-3.5 pb-0 text-left">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[12px] text-indigo-400 font-bold">AI is generating your task...</span>
          </div>
        )}
        
        <div className={cn("flex gap-3 px-5 transition-all duration-300", 
            isGenerating ? "pt-2 pb-3 items-start" : 
            isAiMode ? "py-4 items-center" : 
            "pt-5 pb-3 items-start", 
            "text-left"
        )}>
          {/* Top Left Icon */}
          <div className={cn(!isAiMode && "pt-0.5")}>
            {isInitial ? (
              <Circle className="w-[18px] h-[18px] text-white/20 shrink-0" strokeWidth={2} />
            ) : isDone ? (
              <Circle className="w-[18px] h-[18px] text-white/20 shrink-0" strokeWidth={2} />
            ) : (
              <Sparkles className="w-[18px] h-[18px] text-indigo-400 shrink-0" strokeWidth={1.5} />
            )}
          </div>
          
          <div className="relative flex-1 text-[15px] font-medium leading-relaxed text-left min-w-0">
            
            {/* Title Row (Initial, Typing, Generating) */}
            {!isDone && (
              <div className={cn(
                  "w-full bg-transparent p-0 m-0 border-none transition-colors duration-300 tracking-wide text-left break-words",
                  isInitial ? "text-white/40" : "text-white/90"
                )}
              >
                {isInitial && "Create a new task or type @ai to generate..."}
                {isAiMode && (
                  <div className="inline text-left relative top-[-1px]">
                    {renderTypedText(typedText)}
                    {isTyping && (
                      <motion.span 
                        animate={{ opacity: [1, 0] }} 
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-[2px] h-[1em] bg-indigo-400 ml-[1px] align-middle"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            <AnimatePresence>
              {(isInitial) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="text-[14px] text-white/30 font-normal text-left overflow-hidden"
                >
                    Add description...
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
            {isDone && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full text-left overflow-hidden mt-[-1px]"
              >
                <div className="pb-2">
                {/* Generated Title */}
                <div className="text-white font-semibold text-[15px] mb-3 text-left">
                    Review New Auth Flow Before Tomorrow
                </div>
                
                {/* Generated Description */}
                <div className="text-[14px] leading-[1.6] font-normal text-white/70 space-y-[10px] text-left">
                  <p className="text-left">
                    <span className="text-indigo-300 font-medium bg-indigo-500/15 px-1 py-0.5 rounded mr-1 inline-flex text-[13px] align-baseline">@Ramin</span> 
                    <span>, please review the new authentication flow to ensure it meets our requirements and functions as expected.</span>
                  </p>
                  
                  <ul className="list-disc pl-[22px] text-white/60 space-y-2 mt-3 marker:text-white/40 text-left">
                    <li className="pl-1">Test all authentication scenarios</li>
                    <li className="pl-1">Verify that the flow is intuitive and user-friendly</li>
                    <li className="pl-1">Check for any potential security vulnerabilities</li>
                  </ul>
                  
                  {/* Blockquote style for italic ending */}
                  <p className="italic text-white/50 pt-1 mt-3 border-l-[3px] border-white/10 pl-3 text-left">
                    Deadline for sign-off is tomorrow at EOD.
                    <motion.span 
                        animate={{ opacity: [1, 0] }} 
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-[1.5px] h-3 bg-white/40 ml-1"
                      />
                  </p>
                </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Top Right Icons */}
          <div className="flex gap-1 items-start shrink-0 ml-2">
            <button className="p-1.5 rounded-md transition-colors text-white/30 hover:text-white/50"><Calendar className="w-[18px] h-[18px]" strokeWidth={1.5} /></button>
            <button className="p-1.5 rounded-md transition-colors text-white/30 hover:text-white/50"><Bell className="w-[18px] h-[18px]" strokeWidth={1.5} /></button>
            {isDone ? (
              <button className="p-1.5 rounded-md transition-colors text-white/30 hover:text-white/50"><Paperclip className="w-[18px] h-[18px]" strokeWidth={1.5} /></button>
            ) : isAiMode ? (
              <>
                <button className="p-1.5 rounded-md transition-colors text-white/30 hover:text-white/50"><Flag className="w-[18px] h-[18px]" strokeWidth={1.5} /></button>
                <button className="p-1.5 rounded-md transition-colors text-white/30 hover:text-white/50"><UserPlus className="w-[18px] h-[18px]" strokeWidth={1.5} /></button>
                <button className="p-1.5 rounded-md transition-colors text-white/30 hover:text-white/50"><Tag className="w-[18px] h-[18px]" strokeWidth={1.5} /></button>
              </>
            ) : (
              <>
                <button className="p-1.5 rounded-md transition-colors text-white/30 hover:text-white/50"><Flag className="w-[18px] h-[18px]" strokeWidth={1.5} /></button>
                <button className="p-1.5 rounded-md transition-colors text-white/30 hover:text-white/50"><Paperclip className="w-[18px] h-[18px]" strokeWidth={1.5} /></button>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <AnimatePresence>
        {!isAiMode && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="border-t border-white/5 bg-transparent overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex gap-2 flex-wrap items-center">
              {isDone ? (
                <>
                  {/* Emerald Chip */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-950/50 text-emerald-500 text-[12px] font-medium border border-emerald-900/60 shadow-sm cursor-pointer hover:bg-emerald-900/40 transition-colors">
                      <Calendar className="w-[14px] h-[14px]" strokeWidth={2} /> Today at 5:30 AM <X className="w-3 h-3 ml-0.5 opacity-60 hover:opacity-100" />
                  </div>
                {/* Indigo Chip */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-indigo-950/50 text-indigo-400 text-[12px] font-medium border border-indigo-900/60 shadow-sm cursor-pointer hover:bg-indigo-900/40 transition-colors">
                    <div className="w-[18px] h-[18px] rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-[10px] font-bold">R</div> 
                    1 assigned <X className="w-3 h-3 ml-0.5 opacity-60 hover:opacity-100" />
                </div>
                {/* Gray Chip */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-transparent text-white/60 text-[12px] font-medium border border-white/10 shadow-sm cursor-pointer hover:bg-white/5 transition-colors">
                    <Tag className="w-[14px] h-[14px]" strokeWidth={2} /> 2 Labels
                </div>
                {/* Flag */}
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-yellow-500 text-[12px] font-medium pl-2 cursor-pointer hover:bg-white/5 transition-colors">
                    <Flag className="w-[14px] h-[14px]" strokeWidth={2.5} /> High <MoreHorizontal className="w-4 h-4 ml-1 opacity-50" />
                </div>
              </>
            ) : (
              <>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 text-white/50 hover:text-white/80 text-[12px] font-medium border border-white/5 transition-colors">
                    <UserPlus className="w-[14px] h-[14px]" strokeWidth={2} /> Assignee
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 text-white/50 hover:text-white/80 text-[12px] font-medium border border-white/5 transition-colors">
                    <Tag className="w-[14px] h-[14px]" strokeWidth={2} /> Labels
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/50 hover:text-white/80 text-[12px] font-medium transition-colors">
                    <Flag className="w-[14px] h-[14px]" strokeWidth={2} /> Normal
                </button>
                <button className="px-1 text-white/40 hover:text-white/70 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
              </>
            )}
            </div>
            <div className="flex items-center shrink-0 ml-2">
              <Button className="h-8 bg-[#6366f1] hover:bg-[#5a5ce6] text-white border-0 font-medium px-4 shadow-lg shadow-indigo-500/20 text-[13px] rounded-[8px] transition-all">
                Create Task
              </Button>
            </div>
          </div>
        </motion.div>
        )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
