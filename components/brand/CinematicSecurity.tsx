import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Shield, WifiOff, CheckCircle2, Laptop, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

type SecurityMode = 'e2e' | 'local' | 'open';

export function CinematicSecurity() {
  const [activeMode, setActiveMode] = useState<SecurityMode>('e2e');

  useEffect(() => {
    const modes: SecurityMode[] = ['e2e', 'local', 'open'];
    const interval = setInterval(() => {
      setActiveMode(prev => {
        const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
        return modes[nextIdx];
      });
    }, 6000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-10 pb-10 md:py-22  md:pb-25 px-6 relative bg-[#F4F4F2] border-t border-black/[0.03]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-2 md:gap-16 lg:gap-24 items-center">
          
          {/* Left: Minimal Typographic Feature Text */}
          <div className="space-y-6 md:space-y-8 relative z-10 lg:pl-4">
            
            <h2 className="text-3xl md:text-[2.5rem] lg:text-[2.5rem] font-bold leading-tight tracking-tight text-zinc-900 font-[family-name:var(--font-inter)]">
              What happens on your device,<br />
              <span className="text-zinc-500">stays on your device.</span>
            </h2>
            
            <p className="text-base md:text-lg text-zinc-700 leading-relaxed max-w-xl font-medium">
              We don't sell your data because we literally can't see it. ReCollect is built on a strict zero-knowledge architecture.
            </p>

            {/* Clean Interactive List */}
            <div className="grid gap-2 md:gap-3 pt-2 md:pt-4">
              <FeatureBtn 
                isActive={activeMode === 'e2e'} 
                onClick={() => setActiveMode('e2e')}
                icon={Lock}
                title="End-to-End Encryption"
                desc="Military-grade AES-256 encryption applied before sync."
              />
              <FeatureBtn 
                isActive={activeMode === 'local'} 
                onClick={() => setActiveMode('local')}
                icon={WifiOff}
                title="Local-First Operations"
                desc="Work completely offline without waiting for central servers."
              />
              <FeatureBtn 
                isActive={activeMode === 'open'} 
                onClick={() => setActiveMode('open')}
                icon={CheckCircle2}
                title="Open Cryptography"
                desc="Publicly auditable security implementations. Trust but verify."
              />
            </div>
          </div>

          {/* Right: Ultra-Minimal White Card Visualization */}
          <div className="relative h-[400px] sm:h-[450px] md:h-[500px] flex items-center justify-center">
             <div className="w-full max-w-[420px] h-full sm:h-[440px] rounded-[24px] md:rounded-[32px] bg-white border border-black/[0.08] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col relative transform scale-[0.85] sm:scale-100 origin-center">
                <VaultDiagram mode={activeMode} />
             </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function FeatureBtn({ isActive, onClick, icon: Icon, title, desc }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-start gap-4 p-5 rounded-2xl text-left transition-all duration-300",
        isActive 
          ? "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.08]" 
          : "bg-transparent border border-transparent hover:bg-black/[0.03]"
      )}
    >
      <div className={cn(
        "p-3 rounded-xl transition-all duration-300 flex shrink-0 border",
        isActive ? "bg-zinc-900 text-white border-zinc-900 shadow-md" : "bg-zinc-200/50 text-zinc-600 border-transparent"
      )}>
        <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
      </div>
      <div className="pt-0.5">
        <h3 className={cn("font-bold text-[15px] mb-1 transition-colors", isActive ? "text-zinc-900" : "text-zinc-700")}>
          {title}
        </h3>
        <p className={cn("text-sm leading-snug transition-colors", isActive ? "text-zinc-600" : "text-zinc-500")}>{desc}</p>
      </div>
    </button>
  );
}

function VaultDiagram({ mode }: { mode: 'e2e' | 'local' | 'open' }) {
    return (
        <div className="w-full h-full p-8 flex flex-col justify-center items-center font-[family-name:var(--font-inter)]">
            
            {/* The Diagram */}
            <div className="relative w-full max-w-[340px] flex items-center justify-between mt-4">
                
                {/* Background Lines */}
                <div className="absolute left-8 right-8 top-8 h-[2px] -z-10 flex">
                     {/* Left Line Segment (Device -> Crypto) */}
                     <div className={cn(
                         "h-full w-1/2 transition-all duration-700",
                         mode === 'local' ? "bg-transparent border-t-[2px] border-dashed border-zinc-300" : 
                         mode === 'open' ? "bg-blue-400" :
                         "bg-zinc-900"
                     )} />
                     {/* Right Line Segment (Crypto -> Server) */}
                     <div className={cn(
                         "h-full w-1/2 transition-all duration-700",
                         mode === 'local' ? "bg-transparent border-t-[2px] border-dashed border-zinc-200" : 
                         mode === 'open' ? "bg-blue-400" :
                         "bg-transparent border-t-[2px] border-dashed border-zinc-400"
                     )} />
                </div>

                {/* Node 1: Device */}
                <div className="flex flex-col items-center gap-4 bg-white px-2">
                    <div className="w-16 h-16 rounded-[20px] bg-white border border-zinc-200 shadow-sm flex items-center justify-center relative z-10 transition-all duration-500">
                        <Laptop className="w-6 h-6 text-zinc-800" strokeWidth={1.5} />
                        
                        {/* Status Check (Local Mode Animation) */}
                        <AnimatePresence>
                            {mode === 'local' && (
                                <motion.div 
                                    initial={{scale:0}} 
                                    animate={{scale:1}} 
                                    exit={{scale:0}}
                                    transition={{type:"spring", duration: 0.5, delay:0.1}} 
                                    className="absolute -bottom-2 -right-2 w-7 h-7 bg-zinc-900 rounded-full border-[2.5px] border-white flex items-center justify-center shadow-md"
                                >
                                    <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-widest">Device</span>
                </div>

                {/* Node 2: Crypto / Severed */}
                <div className="flex flex-col items-center gap-4 bg-white px-4">
                    <div className={cn(
                        "w-12 h-12 rounded-full border flex items-center justify-center relative z-10 transition-all duration-700",
                        mode === 'open' ? "bg-blue-50 border-blue-200 shadow-sm" : 
                        mode === 'local' ? "bg-transparent border-transparent scale-110" : 
                        "bg-zinc-900 border-zinc-800 shadow-md"
                    )}>
                        {mode === 'open' ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                        ) : mode === 'local' ? (
                            <motion.div initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.8}}>
                                <WifiOff className="w-6 h-6 text-zinc-400" strokeWidth={2} />
                            </motion.div>
                        ) : (
                            <Lock className="w-4 h-4 text-white transition-colors" strokeWidth={2} />
                        )}
                    </div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors duration-700", 
                        mode === 'open' ? "text-blue-600" : 
                        mode === 'local' ? "text-zinc-400" : "text-zinc-900"
                    )}>
                        {mode === 'open' ? 'Verified' : mode === 'local' ? 'Airgapped' : 'AES-256'}
                    </span>
                </div>

                {/* Node 3: Cloud */}
                <div className="flex flex-col items-center gap-4 bg-white px-2">
                    <div className={cn(
                        "w-16 h-16 rounded-[20px] border flex items-center justify-center relative z-10 transition-all duration-700",
                        mode === 'local' ? "bg-zinc-50 border-zinc-200 opacity-60 scale-95" : "bg-white border-zinc-200 shadow-sm scale-100"
                    )}>
                        <Cloud className={cn("w-6 h-6 transition-colors", mode === 'local' ? "text-zinc-400" : "text-zinc-800")} strokeWidth={1.5} />
                    </div>
                    <span className={cn("text-[11px] font-bold uppercase tracking-widest transition-colors duration-700", mode === 'local' ? "text-zinc-400" : "text-zinc-700")}>
                        Servers
                    </span>
                </div>
            </div>

            {/* Explanation box */}
            <div className="mt-14 w-full max-w-[320px] bg-zinc-50/80 border border-zinc-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[100px] shadow-sm">
                <AnimatePresence mode="wait">
                    {mode === 'e2e' && (
                        <motion.p key="e2e" initial={{opacity:0, y:2}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-2}} transition={{duration:0.2}} className="text-[13px] text-zinc-700 leading-relaxed font-medium">
                            Data is irreversibly encrypted before leaving your device. Servers only sync <span className="text-zinc-900 font-bold">zero-knowledge ciphertext</span>.
                        </motion.p>
                    )}
                    {mode === 'local' && (
                        <motion.p key="local" initial={{opacity:0, y:2}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-2}} transition={{duration:0.2}} className="text-[13px] text-zinc-700 leading-relaxed font-medium">
                            Network severed. All operations and storage routed strictly to <span className="text-zinc-900 font-bold">local disk</span>.
                        </motion.p>
                    )}
                    {mode === 'open' && (
                        <motion.p key="open" initial={{opacity:0, y:2}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-2}} transition={{duration:0.2}} className="text-[13px] text-zinc-700 leading-relaxed font-medium">
                            Our cryptography is fully public. <span className="text-zinc-900 font-bold">Audited, verified, and standard</span>. No proprietary black boxes.
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
            
        </div>
    );
}
