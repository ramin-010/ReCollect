'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  ArrowRight, 
  Sparkles, 
  Layers, 
  Zap, 
  Brain, 
  Share2, 
  MousePointer2,
  CheckCircle2,
  Play,
  Lock,
  Globe,
  Keyboard,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { CinematicDocsViewer } from '@/components/brand/CinematicDocsViewer';
import { Doodle } from '@/components/brand/Doodle';
import { CommunityDoodles } from '@/components/brand/CommunityDoodles';
import { CinematicWhiteboardViewer } from '@/components/brand/CinematicWhiteboardViewer';
import { LandingTaskDemo } from '@/components/brand/LandingTaskDemo';


// --- Media Placeholder Component ---
function MediaPlaceholder({ type, prompt, height = "h-64 md:h-96" }: { type: string, prompt: string, height?: string }) {
    return (
        <div className={cn("relative w-full rounded-2xl border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-2xl group", height)}>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_3s_infinite]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="bg-black/50 backdrop-blur-md p-4 rounded-xl border border-white/5 max-w-md">
                    <span className="text-xs font-mono text-blue-400 mb-2 block uppercase tracking-widest">{type} Placeholder</span>
                    <p className="text-sm text-gray-400 italic">"{prompt}"</p>
                </div>
            </div>
             {/* Abstract Gradient generic bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-50" />
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
      <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/5 bg-[#0A0A0A]/20 backdrop-blur-lg">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Logo size="lg" />
            </div>
            <div className="flex items-center gap-6">
                {/* Community Widget as Sign Up Trigger */}
                <div 
                    onClick={() => router.push('/signup')}
                    className="hidden md:flex items-center gap-3 cursor-pointer group"
                >
                    <div className="flex -space-x-2 group-hover:scale-105 transition-transform">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0A0A0A] bg-white overflow-hidden">
                                <img 
                                    src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${['felix','zack','aneka'][i]}&backgroundColor=transparent`}
                                    alt="User"
                                    className="w-full h-full object-cover scale-150 translate-y-1"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-medium group-hover:text-white transition-colors">Join the Community</span>
                        <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Sign Up Free</span>
                    </div>
                </div>

                <div className="w-px h-8 bg-white/10 hidden md:block" />

                <Button variant="ghost" size="sm" onClick={() => router.push('/login')} className="text-gray-400 hover:text-white hover:bg-white/5">
                    Sign In
                </Button>
            </div>
        </div>
      </nav>

      {/* --- 1. HERO SECTION (Original Design + Video Overlay) --- */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-[90vh] flex flex-col justify-center">
        {/* Background Blobs */}
        <motion.div style={{ y: y1 }} className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        <motion.div style={{ y: y2 }} className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10" />
        
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        
        {/* HERO ANIMATED GRADIENT MESH */}
        <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none">
          
            {/* Animated Gradient Orbs */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
            </div>
            {/* Subtle Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjgiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjYSkiLz48L3N2Zz4=')]" />
        </div>

          <div className="max-w-6xl mx-auto relative mb-20">
               <div className="text-center">
                 <div className="flex flex-col items-center justify-center mb-6">
                   <div className="flex items-center gap-3 mb-4">
                     <Logo size="xll" className="h-12 w-auto text-[hsl(var(--foreground))]" />
                   </div>
                 </div>
                 
                 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--primary))]/10 text-sm font-medium mb-8 text-[hsl(var(--primary))]">
                   <Sparkles className="w-4 h-4" />
                   Professional Knowledge Management
                 </div>
                 
                 <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
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
                 
                  <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => router.push('/signup')}
                      className="gap-3 pl-4 pr-6"
                    >
                      {/* Integrated Doodle inside Button */}
                      <div className="w-8 h-8 rounded-full bg-white overflow-hidden border-2 border-white/20 shadow-sm relative -ml-1">
                          <img 
                            src="https://api.dicebear.com/9.x/lorelei/svg?seed=callie&backgroundColor=transparent" 
                            alt="Me"
                            className="w-full h-full object-cover scale-150 translate-y-1"
                          />
                      </div>
                      <span className="font-bold">Start Free Now</span>
                      <ArrowRight className="w-4 h-4 opacity-70" />
                    </Button>
                    
                  </div>
               </div>
             </div>
      </section>

      {/* --- 2. DOCS (The Editor) --- */}
      <section className="py-12 px-6 border-t border-white/5 bg-[hsl(var(--sidebar-bg))]">
        <div className="max-w-8xl mx-auto space-y-8">
             <div className="text-center max-w-2xl mx-auto space-y-3 relative flex flex-col items-center">
                {/* <FeatureBadge icon={CheckCircle2} text="The Editor" color="blue" /> */}
                <h2 className="text-3xl md:text-5xl font-bold leading-tight">Docs that feel like magic.</h2>
                <p className="text-base text-[hsl(var(--muted-foreground))]">
                    Real-time collaboration, slash commands, and integrated tasks—all in one place.
                </p>
             </div>
             
             {/* Wide Cinematic Viewer */}
             <CinematicDocsViewer />
        </div>
      </section>

      {/* --- 3. TASKS HUB (Connectivity) --- */}
      <section className="py-10 px-6 border-t border-white/5 relative overflow-hidden min-h-[50vh] flex flex-col items-center justify-center">

        
        <div className="max-w-4xl w-full text-center space-y-4 relative z-10">
            <div className="space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                    Your Workflow, <br/> <span className="text-emerald-500">Synchronized.</span>
                </h2>
                
            </div>

            {/* Interactive Demo */}
            <div className="w-full flex justify-center min-h-[50vh] ">
                <LandingTaskDemo />
            </div>
        </div>
      </section>

      {/* --- 4. WHITEBOARD (Excalidraw++) --- */}
      {/* --- 4. WHITEBOARD (Infinite Canvas) --- */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
             <div className="order-2 lg:order-1">
                 {/* Cinematic Code Animation */}
                 <CinematicWhiteboardViewer />
             </div>
             <div className="order-1 lg:order-2 space-y-8">
                <FeatureBadge icon={Layers} text="Infinite Canvas" color="purple" />
                <h2 className="text-4xl md:text-6xl font-bold leading-tight">Think bigger <br/> and faster.</h2>
                <div className="space-y-6 text-lg text-[hsl(var(--muted-foreground))]">
                    <p>
                        A whiteboard engine built for speed. We've optimized the sync protocol to be 
                        <span className="text-white font-bold"> 3x faster</span> than standard implementations. 
                        Zero lag, even with hundreds of nodes.
                    </p>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" />
                                Instant Sync
                            </h4>
                            <p className="text-sm opacity-60">Low-latency websocket connection.</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                Local First
                            </h4>
                            <p className="text-sm opacity-60">Works offline, syncs when you're back.</p>
                        </div>
                    </div>
                </div>
             </div>
        </div>
      </section>

      {/* --- 5. SMART NOTES (Visual Focus) --- */}
      <section className="py-32 px-6 border-t border-white/5 bg-gradient-to-b from-transparent to-amber-900/10">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-12">
            <FeatureBadge icon={Brain} text="Second Brain" color="amber" />
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight">Your knowledge, <br/> visualized.</h2>
            
            <div className="w-full relative">
                 <MediaPlaceholder 
                    type="Abstract 3D Image" 
                    prompt="3D visualization: A glowing note card expanding into a web of connected nodes. Blue/Amber lighting. Hyper-realistic." 
                    height="h-96 md:h-[600px]"
                />
                 <div className="absolute bottom-10 left-10 text-left bg-black/80 backdrop-blur-xl p-6 rounded-2xl border border-white/10 max-w-sm hidden md:block">
                    <div className="flex items-center gap-3 mb-2 text-amber-500">
                        <Share2 className="w-5 h-5" />
                        <span className="font-bold uppercase tracking-wider text-xs">Bi-Directional Linking</span>
                    </div>
                    <p className="text-sm text-gray-300">"Every thought is connected. Build a personal knowledge graph that grows stronger with every note you take."</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- 6. QUICK CAPTURE (Speed) --- */}
      <section className="py-24 px-6 border-t border-white/5 flex items-center justify-center min-h-[40vh]">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-2xl font-mono font-bold text-pink-500">
                    <Keyboard className="w-8 h-8" /> 
                    <span>Cmd + K</span>
                </div>
                <h2 className="text-4xl font-bold">Capture at the <br/> speed of thought.</h2>
                <p className="text-lg text-[hsl(var(--muted-foreground))]">
                    Never lose flow. Open the command palette from anywhere to instantly create a task, find a note, or switch contexts.
                </p>
            </div>
            <div>
                 <MediaPlaceholder type="Video Snippet" prompt="Macro shot of keyboard user hitting Cmd+K. Modal pops up instantly on blurred screen. Speed." height="h-64" />
            </div>
        </div>
      </section>

      {/* --- 7. PRIVACY & SECURITY --- */}
      <section className="py-24 px-6 border-t border-white/5 bg-[#050505]">
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                     <FeatureBadge icon={ShieldCheck} text="Security First" color="rose" />
                     <h2 className="text-4xl font-bold">Your data is <br/> yours alone.</h2>
                     <p className="text-lg text-[hsl(var(--muted-foreground))]">
                        We built ReCollect with a Zero-Knowledge architecture. Your thoughts are encrypted locally before they ever touch our servers.
                     </p>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                        {[
                            { title: 'Local First', desc: 'Works offline, syncs later.' },
                            { title: 'E2E Encrypted', desc: 'Military grade encryption.' },
                            { title: 'Zero Knowledge', desc: 'We can\'t see your notes.' },
                        ].map(item => (
                            <div key={item.title} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <Lock className="w-6 h-6 text-rose-500 mb-3" />
                                <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                                <p className="text-xs text-gray-500">{item.desc}</p>
                            </div>
                        ))}
                     </div>
                </div>
                <div>
                     <MediaPlaceholder type="Abstract Security" prompt="Abstract glowing cube enclosed by metallic transparent shields. Safe, fortress vibe." />
                </div>
            </div>
        </div>
      </section>

      {/* --- 8. FOOTER CTA --- */}
      <section className="relative py-40 px-6 border-t border-white/5 overflow-hidden">
         {/* Deep Space Background Placeholder */}
         <div className="absolute inset-0 -z-10 bg-black">
             <div className="absolute inset-0 opacity-40">
                <MediaPlaceholder type="Background" prompt="Deep space stars, subtle constellations, dark purple nebula. Atmospheric." height="h-full" />
             </div>
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
         </div>

         <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-white drop-shadow-2xl">
                Ready to organize <br/> your mind?
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto drop-shadow-md">
                Join thousands of thinkers, builders, and creators who have made ReCollect their digital home.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                <Button size="lg" variant="primary" onClick={() => router.push('/signup')} className="h-16 px-12 text-xl rounded-full shadow-2xl shadow-indigo-500/50 hover:scale-105 transition-transform">
                    Get Started Free
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push('/login')} className="h-16 px-12 text-xl rounded-full bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 text-white">
                    Sign In
                </Button>
            </div>
            <div className="pt-24 flex items-center justify-center gap-8 text-sm text-gray-500 font-medium">
                <span>© 2026 ReCollect Inc.</span>
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Twitter</a>
            </div>
         </div>
      </section>

    </div>
  );
}
