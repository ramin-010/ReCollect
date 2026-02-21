'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, FileText, CheckSquare, Sparkles } from 'lucide-react';

export function AuthShowcaseGraphic() {
  return (
    <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full" />

      {/* Main Base Card (The "Board") */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute w-72 h-80 bg-white rounded-3xl shadow-xl border border-black/[0.04] p-6 flex flex-col gap-4"
        style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[#F4F4F2] flex items-center justify-center">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold">Team Sync Notes</div>
            <div className="text-[10px] text-muted-foreground">Updated just now</div>
          </div>
        </div>

        {/* Mock Content Lines */}
        <div className="space-y-2">
          <div className="w-3/4 h-2 rounded-full bg-[#F4F4F2]" />
          <div className="w-full h-2 rounded-full bg-[#F4F4F2]" />
          <div className="w-5/6 h-2 rounded-full bg-[#F4F4F2]" />
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2">
            <CheckSquare className="w-4 h-4 text-brand-primary mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium text-foreground">Prepare Q3 Roadmap</div>
              <div className="text-[10px] text-muted-foreground">Due Friday</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded border border-border mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium text-foreground">Review product specs</div>
              <div className="text-[10px] text-muted-foreground">Assigned to Sarah</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Elements */}
      
      {/* Floating Task Graphic */}
      <motion.div
        initial={{ opacity: 0, x: 40, y: -20 }}
        animate={{ opacity: 1, x: 50, y: -40 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        className="absolute top-1/4 right-0 w-48 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-black/[0.04] p-3 flex items-center gap-3 z-20"
      >
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <div className="text-xs font-semibold">Task Completed</div>
          <div className="text-[10px] text-muted-foreground">Roadmap approved</div>
        </div>
      </motion.div>

      {/* Floating Idea Graphic */}
      <motion.div
        initial={{ opacity: 0, x: -40, y: 20 }}
        animate={{ opacity: 1, x: -50, y: 40 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        className="absolute bottom-1/4 left-0 w-40 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-black/[0.04] p-3 flex flex-col gap-2 z-20"
      >
        <div className="flex justify-between items-center">
          <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-amber-600" />
          </div>
          <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Idea</span>
        </div>
        <div className="text-[11px] font-medium leading-tight">Implement graph view for connected notes</div>
      </motion.div>

      {/* Abstract decorative rings matching landing page vibe */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute w-96 h-96 border border-black/[0.02] rounded-full border-dashed z-0 pointer-events-none"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute w-80 h-80 border border-black/[0.03] rounded-full z-0 pointer-events-none"
      />
    </div>
  );
}
