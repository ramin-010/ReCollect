import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Shield, Server, WifiOff, FileText, CheckCircle2 } from 'lucide-react';
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
    <section className="py-24 px-6 relative overflow-hidden bg-[#050505]">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Feature Text */}
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy Archetype</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white/90">
              What happens on your device,<br />
              <span className="text-white">stays on your device.</span>
            </h2>
            
            <p className="text-lg text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xl">
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
          ? "bg-white/5 border-white/10 shadow-lg" 
          : "bg-transparent border-transparent hover:bg-white/[0.02]"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg transition-colors group-hover:scale-110 duration-300",
        isActive ? "bg-white/10 text-white" : "bg-white/5 text-gray-500 group-hover:text-gray-300"
      )}>
        <Icon size={20} />
      </div>
      <div>
        <h3 className={cn("font-bold text-sm mb-1", isActive ? "text-white" : "text-gray-300 group-hover:text-white transition-colors")}>
          {title}
        </h3>
        <p className="text-sm text-gray-500 leading-snug">{desc}</p>
      </div>
    </button>
  );
}

function ScanningCard({ isEncrypted }: { isEncrypted: boolean }) {
  return (
    <div className="relative w-full h-full group">
      {/* Glow Effect - Subtle White */}
      <div className="absolute -inset-1 bg-white/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
      
      <div 
        className="relative w-full h-full bg-[#0A0A0A] rounded-2xl border border-white/10 overflow-hidden shadow-2xl transition-transform duration-700 hover:scale-[1.01]"
      >
        {/* Header */}
        <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2 bg-white/[0.02]">
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
           {PLAIN_TEXT.map((text, i) => (
             <div key={i} className="flex items-center gap-3 py-3 border-b border-white/[0.02] last:border-0 relative group/row hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors">
               <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-gray-600 group-hover/row:text-gray-400 transition-colors" />
               </div>
               <div className="flex-1 min-w-0 font-mono text-sm relative h-5 overflow-hidden">
                 {/* Plain Text Layer */}
                 <motion.span 
                   initial={false}
                   animate={{ y: isEncrypted ? -25 : 0, opacity: isEncrypted ? 0 : 1 }}
                   transition={{ duration: 0.5, delay: i * 0.1 }}
                   className="absolute inset-0 text-gray-400 truncate"
                 >
                   {text}
                 </motion.span>
                 
                 {/* Cipher Text Layer - Keep Green for "Secure" Context but Desaturated */}
                 <motion.span 
                   initial={false}
                   animate={{ y: isEncrypted ? 0 : 25, opacity: isEncrypted ? 1 : 0 }}
                   transition={{ duration: 0.5, delay: i * 0.1 }}
                   className="absolute inset-0 text-emerald-500/80 truncate tracking-tighter"
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
              className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] z-20"
            >
              <div className="relative">
                 <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full animate-pulse" />
                 <Lock className="w-16 h-16 text-emerald-500/80 relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
