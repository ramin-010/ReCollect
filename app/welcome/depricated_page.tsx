// ReCollect Landing Page - Minimalist Premium Design
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui-base/Button';
import { 
  Shield, 
  Sparkles, 
  ArrowRight,
  Globe,
  Lock,
  Cloud,
  MousePointer2,
  Layout,
  Clock,
  Layers,
  Zap,
  FileText,
  Wallet,
  CheckSquare,
  CheckCircle2
} from 'lucide-react';
import { motion, useScroll, useTransform } from "framer-motion";
import { AbstractDash } from './_components/AbstractDash';
import { AbstractSmartNotes } from './_components/AbstractSmartNotes';
import { AbstractFlow } from './_components/AbstractFlow';
import { AbstractMomentum } from './_components/AbstractMomentum';
import { AbstractGrowth } from './_components/AbstractGrowth';

export default function WelcomePage() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  
  // Parallax for background blobs
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -500]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--primary))]/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--background))]/80 backdrop-blur-md border-b border-[hsl(var(--border))]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo size="lg" />
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/login')}
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                onClick={() => router.push('/signup')}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {/* --- UNIFIED INTRO SECTION: HERO + DASHBOARD --- */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Blobs (Parallax) - Shared across Hero & Dash */}
        <motion.div style={{ y: y1 }} className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        <motion.div style={{ y: y2 }} className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10" />
        
        {/* HERO CONTENT */}
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
                className="gap-2"
              >
                Start Free Now
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* FEATURE SPOTLIGHT 1: DASHBOARD (The "Hook") */}
        <div className="max-w-[1350px] mx-auto">
          {/* ABSTRACT COMPONENT: DASHBOARD - Full Width */}
          <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative h-[600px] w-full rounded-3xl border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-2xl ring-1 ring-white/5"
          >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 via-transparent to-purple-900/10" />
              {/* Grid Texture Overlay - Behind Content */}
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
              <div className="relative z-10 w-full h-full">
                <AbstractDash />
              </div>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURE SPOTLIGHT 2: KNOWLEDGE GRAPH --- */}
      {/* --- FEATURE SPOTLIGHT 2: KNOWLEDGE GRAPH --- */}
      {/* --- FEATURE SPOTLIGHT 2: SMART BLOCKS --- */}
      <section className="relative py-32 px-6 border-t border-white/[0.05] bg-gradient-to-b from-transparent to-white/[0.02]">
         <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
               
               {/* VISUAL - LEFT SIDE */}
               <motion.div
                  className="order-2 lg:order-1 relative h-[600px] w-full rounded-3xl border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-2xl ring-1 ring-white/5"
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
               >
                  {/* Premium Interior Styling */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5" />
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                  
                  <div className="relative z-10 w-full h-full">
                     <AbstractSmartNotes />
                  </div>
               </motion.div>

               {/* TEXT - RIGHT SIDE */}
               <motion.div
                  className="order-1 lg:order-2 space-y-8 pl-0 lg:pl-10"
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
               >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-sm font-semibold tracking-wide border border-amber-500/20">
                     <FileText size={16} />
                     <span>CONNECTED THINKING</span>
                  </div>
                  
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                     Map Your <br/>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">Mind Flow.</span>
                  </h2>
                  
                  <p className="text-lg md:text-xl text-[hsl(var(--muted-foreground))] leading-relaxed max-w-lg shadow-lg">
                     Structure complex problems into clear hierarchies. Drag out connections, attach visual assets, and share your entire thought process in one link.
                  </p>
                  
                  <div className="flex flex-col gap-4 pt-4">
                     {["Hierarchical Mind Mapping", "Visual Asset Integration", "One-Click Sharing"].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                           </div>
                           <span className="text-[hsl(var(--foreground))] font-medium">{item}</span>
                        </div>
                     ))}
                  </div>

                  <Button variant="ghost" className="group mt-4 -ml-4 text-amber-500 hover:text-amber-400">
                     Start Mapping <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
               </motion.div>
            </div>
         </div>
      </section>

      {/* --- FEATURE SPOTLIGHT 3: VISUAL THINKING (Whiteboard) --- */}
      {/* --- FEATURE SPOTLIGHT 3: VISUAL THINKING (Whiteboard) --- */}
      {/* --- FEATURE SPOTLIGHT 3: VISUAL THINKING (Whiteboard) --- */}
      <section className="relative py-32 px-6 border-t border-white/[0.05]">
         <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
               <motion.div
                 initial={{ opacity: 0, x: -50 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 className="space-y-8 pr-0 lg:pr-10"
                 transition={{ duration: 0.6 }}
               >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-500 text-sm font-semibold tracking-wide border border-purple-500/20">
                     <Layers size={16} />
                     <span>INFINITE CANVAS</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                     Think <br/>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Visually.</span>
                  </h2>
                  <p className="text-lg md:text-xl text-[hsl(var(--muted-foreground))] leading-relaxed ">
                     Some ideas don't fit into sentences. Switch to the infinite whiteboard to sketch diagrams, 
                     map out dependencies, or wireframe your next big project.
                  </p>
                  <div className="space-y-4 pt-4">
                      {[
                         { icon: MousePointer2, text: "Drag & Drop Interface" },
                         { icon: Layout, text: "Smart Auto-layout" },
                         { icon: Clock, text: "Version History" }
                      ].map((item, i) => (
                         <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] flex items-center justify-center">
                               <item.icon className="w-4 h-4 text-[hsl(var(--primary))]" />
                            </div>
                            <span className="font-medium text-sm">{item.text}</span>
                         </div>
                      ))}
                  </div>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  className="relative h-[600px] w-full rounded-3xl border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-2xl ring-1 ring-white/5"
               >
                  <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/5 via-transparent to-blue-500/5" />
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                  <div className="relative z-10 w-full h-full">
                     <AbstractFlow />
                  </div>
               </motion.div>
            </div>
         </div>
      </section>

      {/* --- FEATURE GRID: TASKS & FINANCE --- */}
      {/* --- FEATURE GRID: TASKS & FINANCE --- */}
      {/* --- FEATURE GRID: TASKS & FINANCE --- */}
      <section className="relative py-32 px-6 border-t border-white/[0.05] bg-gradient-to-b from-transparent to-white/[0.02]">
           <div className="max-w-7xl mx-auto mb-20 text-center">
               <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Everything Else You Need.</h2>
               <p className="text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">Complete your productivity system with integrated tools designed to keep you in flow.</p>
           </div>

           <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* TASKS CARD */}
               <motion.div 
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="rounded-3xl border border-white/10 bg-[#0A0A0A] p-10 h-[500px] overflow-hidden relative group shadow-2xl ring-1 ring-white/5"
               >
                   <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-50" />
                   <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>
                   
                   <div className="relative z-10 mb-8">
                      <div className="inline-flex p-3 rounded-xl bg-emerald-500/10 text-emerald-500 mb-6 border border-emerald-500/20">
                         <Zap size={24} />
                      </div>
                      <h3 className="text-3xl font-bold mb-3">Momentum & Tasks</h3>
                      <p className="text-[hsl(var(--muted-foreground))] text-lg">Track progress with momentum-based habits and todo lists.</p>
                   </div>
                   <div className="absolute inset-x-0 bottom-0 h-[300px] mask-gradient-to-t">
                      <AbstractMomentum />
                   </div>
               </motion.div>

               {/* FINANCE CARD */}
               <motion.div 
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="rounded-3xl border border-white/10 bg-[#0A0A0A] p-10 h-[500px] overflow-hidden relative group shadow-2xl ring-1 ring-white/5"
               >
                   <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-transparent opacity-50" />
                   <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>

                   <div className="relative z-10 mb-8">
                      <div className="inline-flex p-3 rounded-xl bg-pink-500/10 text-pink-500 mb-6 border border-pink-500/20">
                         <Wallet size={24} />
                      </div>
                      <h3 className="text-3xl font-bold mb-3">Finance Tracker</h3>
                      <p className="text-[hsl(var(--muted-foreground))] text-lg">Keep track of subscriptions and expenses right where you work.</p>
                   </div>
                   <div className="absolute inset-x-0 bottom-0 h-[300px] mask-gradient-to-t">
                      <AbstractGrowth />
                   </div>
               </motion.div>
           </div>
       </section>

      {/* --- Sync Section (Original) --- */}
      <section className="py-24 px-6 overflow-hidden">
         <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
               <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
               >
                  <div className="relative w-full aspect-video bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-3xl border border-blue-500/30 flex items-center justify-center overflow-hidden">
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
                     <motion.div 
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="p-8 bg-blue-500 rounded-3xl shadow-2xl"
                     >
                        <Cloud className="w-16 h-16 text-white" />
                     </motion.div>
                  </div>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
               >
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                     <Shield className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-6">Private. Local. Always On.</h2>
                  <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8 leading-relaxed">
                     Your data is saved locally first. End-to-end encryption ensures that your thoughts remain private, 
                     even when synced across all your devices.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-2xl bg-[hsl(var(--muted))]/5 border border-[hsl(var(--border))]">
                        <Lock className="w-5 h-5 text-blue-500 mb-2" />
                        <h4 className="font-bold text-sm mb-1">E2E Ready</h4>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Military grade security for your notes.</p>
                     </div>
                     <div className="p-4 rounded-2xl bg-[hsl(var(--muted))]/5 border border-[hsl(var(--border))]">
                        <Globe className="w-5 h-5 text-blue-500 mb-2" />
                        <h4 className="font-bold text-sm mb-1">Offline First</h4>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Work anywhere, sync later.</p>
                     </div>
                  </div>
               </motion.div>
            </div>
         </div>
      </section>

      {/* --- Footer (Original) --- */}
      <footer className="py-32 px-6 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[hsl(var(--primary))]/5 -z-10" />
         <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
               <h2 className="text-4xl sm:text-6xl font-bold mb-8 tracking-tighter">Your thoughts, amplified.</h2>
               <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button size="lg" className="h-14 px-10 text-lg rounded-full" onClick={() => router.push('/signup')}>
                     Get Started Free
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-10 text-lg rounded-full" onClick={() => router.push('/login')}>
                     Sign In
                  </Button>
               </div>
            </motion.div>
            <div className="mt-32 pt-8 border-t border-[hsl(var(--border))] flex justify-between items-center text-sm text-[hsl(var(--muted-foreground))]">
               <Logo size="sm" />
               <span>© {new Date().getFullYear()} ReCollect Labs</span>
            </div>
         </div>
      </footer>
    </div>
  );
}
