'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  Sparkles, 
  Keyboard,
  Github,
  FileText,
  CheckSquare,
  LayoutList,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { CinematicDocsViewer } from '@/components/brand/CinematicDocsViewer';
import { LandingTaskDemo } from '@/components/brand/LandingTaskDemo';

// Lazy-load heavy below-the-fold components
const CinematicWhiteboardViewer = dynamic(
  () => import('@/components/brand/CinematicWhiteboardViewer').then(m => ({ default: m.CinematicWhiteboardViewer })),
  { ssr: false }
);
const CinematicSecurity = dynamic(
  () => import('@/components/brand/CinematicSecurity').then(m => ({ default: m.CinematicSecurity })),
  { ssr: false }
);


// --- Media Placeholder Component ---
function MediaPlaceholder({ type, prompt, height = "h-64 md:h-96" }: { type: string, prompt: string, height?: string }) {
    return (
        <div className={cn("relative w-full rounded-2xl border border-border bg-card overflow-hidden shadow-2xl group", height)}>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_3s_infinite] opacity-30 dark:opacity-100" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="bg-background/80 backdrop-blur-md p-4 rounded-xl border border-border max-w-md">
                    <span className="text-xs font-mono text-primary mb-2 block uppercase tracking-widest">{type} Placeholder</span>
                    <p className="text-sm text-muted-foreground italic">"{prompt}"</p>
                </div>
            </div>
             {/* Abstract Gradient generic bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 opacity-50" />
        </div>
    );
}

// --- Feature Badge ---
function FeatureBadge({ icon: Icon, text, color = "blue" }: { icon: any, text: string, color?: string }) {
    const colorStyles = {
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    }[color] || "bg-gray-500/10 text-gray-500";

    return (
        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-6", colorStyles)}>
            <Icon size={14} />
            <span>{text}</span>
        </div>
    );
}

export default function WelcomePage() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();

  
  // Parallax for blobs (from original design)
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -500]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      
      {/* --- Navigation --- */}
      <nav className="fixed top-3 inset-x-0 z-50 flex justify-center px-4">
        <div className="flex items-center justify-between w-full max-w-5xl h-14 pr-2 pl-6 bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg rounded-full">
            <div className="flex items-center gap-2">
                <Logo size="lg" className="text-foreground" />
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6 z-10">
                {/* Community Doodle Widget */}
                <div className="hidden lg:flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {[0, 1, 2].map((i) => (
                            <div 
                                key={i} 
                                className="relative w-7 h-7 rounded-full border border-background bg-card overflow-hidden shadow-sm"
                            >
                                <img 
                                    src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${['felix','zack','aneka'][i]}&backgroundColor=transparent`}
                                    alt="User"
                                    className="w-full h-full object-cover scale-150 translate-y-1"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-[10px] text-muted-foreground font-medium leading-none mb-0.5">Community</span>
                        <span className="text-xs font-bold text-foreground leading-none">Active Builders</span>
                    </div>
                </div>

                <div className="w-px h-6 bg-border/50 hidden lg:block" />

                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm font-medium text-foreground hover:opacity-70 transition-opacity px-2">
                      Log in
                  </Link>
                  <Button onClick={() => router.push('/signup')} className="bg-[#0070F3] hover:bg-[#0060D0] text-white rounded-full px-5 py-2 font-medium h-10 text-sm shadow-sm border-none transition-colors">
                      Get ReCollect free
                  </Button>
                </div>
            </div>
        </div>
      </nav>
      {/* --- 1. HERO SECTION (Original Design + Video Overlay) --- */}
      <section className="relative pt-28 pb-0 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-[90vh] flex flex-col justify-center">
        {/* Background Blobs */}
        <motion.div style={{ y: y1 }} className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        <motion.div style={{ y: y2 }} className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10" />
        
          <div className="absolute top-20 left-1/5 w-96 h-96 bg-blue-500/13 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        
        {/* HERO ANIMATED GRADIENT MESH */}
        <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none">
            {/* Animated Gradient Orbs */}
            <div className="absolute top-0 left-0 w-full h-full opacity-60 dark:opacity-100">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/10 to-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
            </div>
            {/* Subtle Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjgiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjYSkiLz48L3N2Zz4=')]" />
        </div>

          <div className="max-w-6xl mx-auto relative mb-18">
               <div className="text-center">
                
                 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--primary))]/10 text-sm font-medium mt-6 mb-8 text-[hsl(var(--primary))]">
                   <Sparkles className="w-4 h-4" />
                   Professional Knowledge Management
                 </div>
                 
                 <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-8 leading-tight ">
                   <span className="inline-block">Organize Your </span>
                   <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl mx-2 shadow-lg">
                     Thoughts
                   </span>
                   <span className="inline-block"></span>
                   <br className="hidden sm:block" />
                   <span className="inline-block">Amplify Your </span>
                   <span className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl mx-2 shadow-lg">
                     Knowledge
                   </span>
                   <span className="inline-block"></span>
                 </h1>
                 
                 <p className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] max-w-3xl mx-auto mb-12 leading-relaxed">
                   ReCollect is your professional companion for capturing ideas, organizing knowledge, 
                   and building connections between your thoughts. Never lose a brilliant idea again.
                 </p>
                 
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative z-10 mt-8">
                    <Button
                      size="lg"
                      onClick={() => router.push('/signup')}
                      className="bg-[#0070F3] hover:bg-[#0060D0] text-white rounded-md px-8 h-12 text-base font-semibold shadow-none border-none transition-colors w-full sm:w-auto"
                    >
                      Get ReCollect free
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => window.open('https://github.com/ramin-010', '_blank')}
                      className="rounded-md px-6 h-12 text-base font-semibold border-border hover:bg-muted/50 transition-colors gap-2 w-full sm:w-auto"
                    >
                      <Github className="w-5 h-5" />
                      View on GitHub
                    </Button>
                  </div>
               </div>
             </div>
      </section>

      {/* --- 2. DOCS (The Editor) --- */}
      <section className="py-14 pt-0 px-6 relative overflow-hidden bg-welcome-bg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="max-w-8xl mx-auto space-y-8 relative z-10">
             <div className="relative w-full pb-10">
                 <CinematicDocsViewer />
                 
                 <p className="text-center mt-8 text-lg font-lg text-muted-foreground max-w-3xl mx-auto">
                    Real-time collaboration, slash commands, and integrated tasks—all in one place.
                 </p>
             </div>
        </div>
      </section>

      {/* --- TRANSITION: THE PROBLEM --- */}
      <section className="py-16 pt-14 px-6 relative z-10 bg-[#F0F0EE] dark:bg-white/[0.02]">
        <div className="max-w-5xl mx-auto text-center space-y-10 relative z-10">
            
            {/* Typographic Statement */}
            <div className="space-y-2">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tighter leading-tight font-[family-name:var(--font-inter)] text-foreground">
                    The problem with modern work.
                </h2>
                <p className="text-xl md:text-xl text-muted-foreground max-w-2xl mx-auto drop-shadow-md">
                    Too many tools. Too much noise. Not enough flow.
                </p>
            </div>

            {/* The 3 Problems Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Problem 1 */}
                <div className="p-6 rounded-2xl bg-[#FBFBFA] dark:bg-zinc-900/50 border border-border shadow-sm text-left flex flex-col items-start space-y-4 hover:-translate-y-1 transition-transform duration-300">
                     <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                         <FileText className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-xl font-bold text-foreground font-[family-name:var(--font-inter)] tracking-tight">Scattered Knowledge</h3>
                         <p className="text-muted-foreground text-sm mt-2 leading-relaxed">Your notes are trapped in isolated documents, making it impossible to find context when you actually need it.</p>
                     </div>
                </div>
                {/* Problem 2 */}
                <div className="p-6 rounded-2xl bg-[#FBFBFA] dark:bg-zinc-900/50 border border-border shadow-sm text-left flex flex-col items-start space-y-4 hover:-translate-y-1 transition-transform duration-300">
                     <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                         <CheckSquare className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-xl font-bold text-foreground font-[family-name:var(--font-inter)] tracking-tight">Disconnected Tasks</h3>
                         <p className="text-muted-foreground text-sm mt-2 leading-relaxed">Action items live in a completely different app, creating a massive gap between planning and doing.</p>
                     </div>
                </div>
                {/* Problem 3 */}
                <div className="p-6 rounded-2xl bg-[#FBFBFA] dark:bg-zinc-900/50 border border-border shadow-sm text-left flex flex-col items-start space-y-4 hover:-translate-y-1 transition-transform duration-300">
                     <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                         <LayoutList className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-xl font-bold text-foreground font-[family-name:var(--font-inter)] tracking-tight">Endless Switching</h3>
                         <p className="text-muted-foreground text-sm mt-2 leading-relaxed">Jumping between wikis, trackers, and whiteboards breaks your focus and kills momentum.</p>
                     </div>
                </div>
                
            </div>
            
            {/* Sleek Horizontal Beam Transition */}
            <div className="relative flex justify-center items-center mt-16 mb-8">
                <div className="relative w-full max-w-2xl h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent overflow-hidden">
                    {/* Animated flowing highlight across the line */}
                    <motion.div 
                        className="absolute top-0 h-full w-[40%] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                        animate={{ left: ["-40%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    />
                </div>
            </div>

            {/* Soft Transitional Bridge removed and moved into LandingTaskDemo */}

            {/* Interactive Demo with Stage Container */}
            <div className="relative w-full flex justify-center min-h-[50vh] mt-8">
                 {/* Refined Emerald Stage Glow */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08)_0%,transparent_50%)] -z-10 pointer-events-none rounded-full blur-3xl" />
                 
                 <LandingTaskDemo />
            </div>

            {/* Integrated Quick Capture Feature */}
            <div className="max-w-5xl mx-auto mt-20 pt-12 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-12 text-left relative z-10">
                <div className="flex-1 space-y-5">
                     <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-foreground/70 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                        <Keyboard className="w-4 h-4" /> 
                        <span>Cmd + K</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight font-[family-name:var(--font-inter)]">
                        Capture at the speed of thought.
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                        Never lose flow. Open the command palette from anywhere to instantly create a task, find a note, or switch contexts without leaving your keyboard.
                    </p>
                </div>
                <div className="flex-1 w-full relative">
                     {/* Subtle backdrop for the placeholder */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.05)_0%,transparent_70%)] -z-10 pointer-events-none rounded-full blur-2xl" />
                     <div className="rounded-2xl overflow-hidden border border-border bg-background shadow-lg">
                        <img 
                            src="/quick3.png" 
                            alt="Quick Capture Command Palette" 
                            className="w-full h-auto object-cover max-h-[400px] md:max-h-[500px]"
                        />
                     </div>
                </div>
            </div>
        </div>
      </section>
      
      {/* --- WHITEBOARD (Infinite Canvas) --- */}
      <section className="py-20 px-6 relative overflow-hidden bg-background">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col items-center">
            
             <div className="w-full max-w-[1280px] text-left mb-8 space-y-4 px-4 xl:px-0">
                 <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight font-[family-name:var(--font-inter)] text-foreground">
                    Think bigger. Move faster.
                 </h2>
                 
                 <p className="text-md md:text-lg text-muted-foreground leading-relaxed max-w-5xl pl-2">
                    A whiteboard engine built for speed. We've optimized the sync protocol to be 
                    <span className="text-foreground font-semibold mx-1">3x faster</span> than standard implementations.<br></br> Zero lag, even with hundreds of nodes.
                </p>
             </div>

             <div className="relative w-full max-w-[1280px] mb-12">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[120%] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08)_0%,transparent_60%)] -z-10 pointer-events-none" />
                 <CinematicWhiteboardViewer />
             </div>
             
        </div>
      </section>

      {/* --- SMART NOTES (Visual Focus) --- */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col items-center">
            
             <div className="w-full max-w-[1300px] text-left mb-12 space-y-4 px-4 xl:px-0">
                 <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight font-[family-name:var(--font-inter)] text-foreground">
                    Your knowledge, visualized.
                 </h2>
                 
                 <p className="text-md md:text-lg text-muted-foreground leading-relaxed max-w-2xl pl-1">
                    Every thought is connected. Build a personal knowledge graph that grows stronger with every note you take. Bi-directional linking ensures you never lose a connection.
                </p>
             </div>

            <div className="w-full relative flex justify-center max-w-[1300px]">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.03)_0%,transparent_60%)] -z-10 pointer-events-none rounded-full blur-3xl" />
                 
                 <div className="w-full rounded-2xl overflow-hidden border border-border/80 shadow-2xl shadow-black/5 dark:shadow-black/20 bg-background/50 backdrop-blur-sm">
                     <MediaPlaceholder 
                        type="Abstract 3D Image" 
                        prompt="3D visualization: A glowing note card expanding into a web of connected nodes. Blue/Amber lighting. Hyper-realistic." 
                        height="h-[60vh] min-h-[400px] max-h-[800px] w-full"
                    />
                 </div>
                 
                 {/* Floating Context Card */}
                 <div className="absolute bottom-8 left-8 text-left bg-background/95 backdrop-blur-xl p-5 rounded-xl border border-border max-w-xs hidden md:block shadow-lg">
                    <div className="flex items-center gap-2 mb-2 text-amber-500">
                        <Share2 className="w-4 h-4" />
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Graph View</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">Instantly visualize how your documents relate to your ongoing tasks and scattered notes.</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- PRIVACY & SECURITY --- */}
      <CinematicSecurity />

      {/* --- CONSOLIDATION & SAVINGS --- */}
      <section className="py-24 px-6 relative z-10 bg-[#F4F4F2] dark:bg-zinc-900/40 overflow-hidden border-t border-border/40">
        <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-12">
                <div className="space-y-4 max-w-2xl">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight font-[family-name:var(--font-inter)]">
                        More workflow.<br/> Zero invoices.
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Stop paying for fragmented tools. Bring your entire team's stack under one roof for free while we are in beta.
                    </p>
                </div>
            </div>

            <div className="w-full bg-[#FBFBFA] dark:bg-black/40 border border-border/80 rounded-3xl p-8 shadow-sm">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 mb-10 pb-10 border-b border-border/60">
                      {/* Col 1 */}
                      <div className="space-y-4 text-sm font-medium">
                           <label className="flex items-center gap-3 cursor-pointer group">
                               <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border text-emerald-500 focus:ring-emerald-500 pointer-events-none" />
                               <span className="text-foreground">Docs & Notes Wiki <span className="text-muted-foreground/60 font-normal ml-1">~$10/user</span></span>
                           </label>
                           <label className="flex items-center gap-3 cursor-pointer group">
                               <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border text-emerald-500 focus:ring-emerald-500 pointer-events-none" />
                               <span className="text-foreground">Infinite Whiteboards <span className="text-muted-foreground/60 font-normal ml-1">~$15/user</span></span>
                           </label>
                      </div>
                      {/* Col 2 */}
                      <div className="space-y-4 text-sm font-medium">
                           <label className="flex items-center gap-3 cursor-pointer group">
                               <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border text-emerald-500 focus:ring-emerald-500 pointer-events-none" />
                               <span className="text-foreground">Integrated Task Tracker <span className="text-muted-foreground/60 font-normal ml-1">~$10/user</span></span>
                           </label>
                           <label className="flex items-center gap-3 cursor-pointer group">
                               <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border text-emerald-500 focus:ring-emerald-500 pointer-events-none" />
                               <span className="text-foreground">Presentations <span className="text-muted-foreground/60 font-normal ml-1">~$10/user</span></span>
                           </label>
                      </div>
                      {/* Col 3 */}
                      <div className="space-y-4 text-sm font-medium">
                           <label className="flex items-center gap-3 cursor-pointer group">
                               <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border text-emerald-500 focus:ring-emerald-500 pointer-events-none" />
                               <span className="text-foreground">Cloud Storage <span className="text-muted-foreground/60 font-normal ml-1">~$12/user</span></span>
                           </label>
                           <label className="flex items-center gap-3 cursor-pointer group">
                               <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border text-emerald-500 focus:ring-emerald-500 pointer-events-none" />
                               <span className="text-foreground">Workflow Automation <span className="text-muted-foreground/60 font-normal ml-1">~$8/user</span></span>
                           </label>
                      </div>
                 </div>

                 {/* Bottom: Totals Comparison */}
                 <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 items-center p-6 bg-[#F4F4F2] dark:bg-zinc-900 rounded-2xl border border-border/40">
                     <div className="hidden border-r border-border/50 pr-8 md:flex flex-col justify-center">
                         <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">The Old Way</p>
                         <p className="text-3xl font-black text-muted-foreground/50 line-through decoration-2 decoration-red-500/50">
                             ~$65/mo
                         </p>
                         <p className="text-xs text-muted-foreground mt-1">per user, fragmented</p>
                     </div>
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                         <div>
                             <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1 uppercase tracking-wider">ReCollect Full Stack</p>
                             <div className="flex items-baseline gap-2">
                                <p className="text-5xl md:text-6xl font-black font-[family-name:var(--font-inter)] tracking-tighter text-foreground">
                                    $0
                                </p>
                                <span className="text-lg font-bold text-muted-foreground">/ forever</span>
                             </div>
                         </div>
                         <Button size="lg" variant="primary" onClick={() => router.push('/signup')} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                            Claim Free Account
                         </Button>
                     </div>
                 </div>
            </div>
            
            <p className="text-center text-sm text-muted-foreground mt-6">
                * Prices based on average competitor standard-tier pricing. ReCollect is currently 100% free while in beta.
            </p>
        </div>
      </section>

      {/* --- FOOTER CTA --- */}
      <section className="relative py-40 pb-10 px-6 border-t border-border overflow-hidden bg-background">
         <div className="absolute inset-0 -z-10 bg-background">
             <div className="absolute inset-0 opacity-40 mix-blend-overlay">
                <MediaPlaceholder type="Background" prompt="Deep space stars, subtle constellations, dark purple nebula. Atmospheric." height="h-full" />
             </div>
             <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
         </div>

         <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground drop-shadow-2xl font-[family-name:var(--font-inter)]">
                Ready to organize <br/> your mind?
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto drop-shadow-md">
                Join thousands of thinkers, builders, and creators who have made ReCollect their digital home.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                <Button size="lg" variant="primary" onClick={() => router.push('/signup')} className="h-16 px-12 text-xl rounded-full shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
                    Get Started Free
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push('/login')} className="h-16 px-12 text-xl rounded-full bg-card/50 backdrop-blur-md border-border hover:bg-card text-foreground">
                    Sign In
                </Button>
            </div>
            <div className="pt-10 flex items-center justify-center gap-8 text-sm text-muted-foreground font-medium">
                <span>© 2026 ReCollect Inc.</span>
                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
            </div>
         </div>
      </section>

    </div>
  );
}
