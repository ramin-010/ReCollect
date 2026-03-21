import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Shield, WifiOff, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Simulated sensitive data
const PLAIN_TEXT = [
  "Project Titan: Launch Protocols",
  "Budget: $2.5M Q3 Allocation",
  "User Data: zero_knowledge_proof.idx",
  "Team Access Keys: [REDACTED]", 
  "Client List: confidential_v2.csv"
];

const CIPHER_TEXT = [
  "U2FsdGVkX19t7/3jK8Z1yQ==",
  "0xd4f8a9b2c3d4e5f6...",
  "eNRd8f9a2b3c4d5e6f7...",
  "7f8a9b0c1d2e3f4a5b...",
  "a1b2c3d4e5f6g7h8i9..."
];

type SecurityMode = 'local' | 'e2e' | 'open';

export function CinematicSecurity() {
  const [activeMode, setActiveMode] = useState<SecurityMode>('e2e');
  const [isEncrypted, setIsEncrypted] = useState(true);

  // Auto-cycle encryption state for demo effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsEncrypted(prev => !prev);
    }, 4000); // Toggle every 4 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 px-6 relative bg-[#F4F4F2]">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Feature Text */}
          <div className="space-y-8 relative z-10">
            
            <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-foreground">
              What happens on your device,<br />
              <span className="text-foreground/80">stays on your device.</span>
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              We don't sell your data because we can't see it. ReCollect is built on a Zero-Knowledge architecture that encrypts everything locally before sync.
            </p>

            {/* Interactive Modes */}
            <div className="grid gap-3 pt-4">
              <FeatureBtn 
                isActive={activeMode === 'local'} 
                onClick={() => setActiveMode('local')}
                icon={WifiOff}
                title="Local-First Mode"
                desc="Works completely offline. No server required."
              />
              <FeatureBtn 
                isActive={activeMode === 'e2e'} 
                onClick={() => setActiveMode('e2e')}
                icon={Lock}
                title="End-to-End Encryption"
                desc="AES-256 encryption on every keystroke."
              />
              <FeatureBtn 
                isActive={activeMode === 'open'} 
                onClick={() => setActiveMode('open')}
                icon={CheckCircle2}
                title="Open Source & Auditable"
                desc="Review our cryptography code yourself."
              />
            </div>
          </div>

          {/* Right: Visualization */}
          <div className="relative h-[500px] flex items-center justify-center -order-1 lg:order-1 perspective-1000">
             <div className="relative w-full max-w-md aspect-[4/5]">
                {/* Device Frame */}
                <ScanningCard isEncrypted={isEncrypted} />
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
        "flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-300 border group",
        isActive 
          ? "bg-white border-border/80 shadow-sm" 
          : "bg-transparent border-transparent hover:bg-black/[0.02]"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg transition-colors group-hover:scale-110 duration-300",
        isActive ? "bg-black/5 text-foreground" : "bg-black/5 text-muted-foreground group-hover:text-foreground"
      )}>
        <Icon size={20} />
      </div>
      <div>
        <h3 className={cn("font-bold text-sm mb-1", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground transition-colors")}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground/80 leading-snug">{desc}</p>
      </div>
    </button>
  );
}

function ScanningCard({ isEncrypted }: { isEncrypted: boolean }) {
  return (
    <div className="relative w-full h-full group">
      {/* Glow Effect - Subtle Dark */}
      <div className="absolute -inset-1 bg-black/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
      
      <div 
        className="relative w-full h-full bg-[#FBFBFA] rounded-2xl border border-border/80 overflow-hidden shadow-2xl transition-transform duration-700 hover:scale-[1.01]"
      >
        {/* Header */}
        <div className="h-12 border-b border-border/60 flex items-center px-4 gap-2 bg-black/[0.02]">
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
           {PLAIN_TEXT.map((text, i) => (
             <div key={i} className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0 relative group/row hover:bg-black/[0.02] -mx-2 px-2 rounded-lg transition-colors">
               <div className="w-8 h-8 rounded bg-black/5 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground group-hover/row:text-foreground transition-colors" />
               </div>
               <div className="flex-1 min-w-0 text-sm relative h-5 overflow-hidden">
                 {/* Plain Text Layer */}
                 <motion.span 
                   initial={false}
                   animate={{ y: isEncrypted ? -25 : 0, opacity: isEncrypted ? 0 : 1 }}
                   transition={{ duration: 0.5, delay: i * 0.1 }}
                   className="absolute inset-0 text-foreground font-medium truncate font-[family-name:var(--font-inter)] tracking-tight"
                 >
                   {text}
                 </motion.span>
                 
                 {/* Cipher Text Layer - Keep Green for "Secure" Context but Desaturated */}
                 <motion.span 
                   initial={false}
                   animate={{ y: isEncrypted ? 0 : 25, opacity: isEncrypted ? 1 : 0 }}
                   transition={{ duration: 0.5, delay: i * 0.1 }}
                   className="absolute inset-0 text-emerald-600 font-mono text-[13px] truncate tracking-tight"
                 >
                    {CIPHER_TEXT[i]}
                 </motion.span>
               </div>
             </div>
           ))}
        </div>

        {/* Scanning Beam Overlay - Subtle Emerald */}
        <AnimatePresence>
            {isEncrypted && (
                <motion.div
                    initial={{ top: "-20%", opacity: 0 }}
                    animate={{ top: "120%", opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
                    className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none z-10"
                >
                    <div className="absolute bottom-0 inset-x-0 h-[1px] bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]" />
                </motion.div>
            )}
        </AnimatePresence>

        {/* Lock Overlay - Minimal */}
        <AnimatePresence>
          {isEncrypted && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] z-20"
            >
              <div className="relative">
                 <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                 <Lock className="w-16 h-16 text-emerald-600 relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
