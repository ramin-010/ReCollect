'use client';

import React from 'react';
import Link from 'next/link';
import { Caveat } from 'next/font/google';

const caveat = Caveat({ subsets: ['latin'], weight: ['400', '700'] });
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Sparkles,
  Keyboard,
  FileText,
  CheckSquare,
  LayoutList,
  Network,
  Ban,
  Database,
  Bot,
  Code2,
  Route,
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { Logo } from '@/components/brand/Logo';
import { CinematicDocsViewer } from '@/components/brand/CinematicDocsViewer';
import { LandingTaskDemo } from '@/components/brand/LandingTaskDemo';

// Only what is true of the app today (STATE §8 "the honest-copy task", 11-15): no claims of
// encryption, teams, slides or email, no invented users.
const AGENT_POINTS = [
  {
    icon: Network,
    title: 'Notes with real diagrams',
    text: 'Agents write Mermaid; Recollect lays out the boxes and arrows, and keeps your own changes when they edit again.',
  },
  {
    icon: LayoutList,
    title: 'The record writes itself',
    text: 'Study sessions, quiz scores and weak spots come in from your chats, so nothing is a log you have to keep.',
  },
  {
    icon: Route,
    title: 'One plan everywhere',
    text: 'Your goals, study paths and the week are the same in the app and in every agent you connect.',
  },
];

const DATA_POINTS = [
  { icon: Ban, text: 'No ads, no selling your data, no trackers.' },
  {
    icon: Database,
    text: 'Your notes live in the app’s database. They are not end-to-end encrypted: the server reads them so search, revisions and sharing work.',
  },
  { icon: Bot, text: 'When you use an AI feature, the text it needs goes to Anthropic’s API to write the answer.' },
  { icon: Code2, text: 'The code is open source under the MIT License: read every line, or run your own copy.' },
];

export default function WelcomePage() {
  const { scrollYProgress } = useScroll();

  
  // Parallax for blobs (from original design)
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -500]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      
      {/* --- Navigation --- */}
      <nav className="fixed top-2 sm:top-3 inset-x-0 z-50 flex justify-center px-2 sm:px-4">
        <div className="flex items-center justify-between w-full max-w-5xl h-12 sm:h-14 pr-1.5 sm:pr-2 pl-4 sm:pl-6 bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg rounded-full">
            <div className="flex items-center transform scale-90 sm:scale-100 origin-left transition-transform">
                <Logo size="lg" className="text-foreground" />
            </div>
            
            <div className="flex items-center gap-2 sm:gap-6 z-10">
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <Link href="/login" className="whitespace-nowrap text-[13px] sm:text-[14px] font-medium text-foreground hover:opacity-70 transition-opacity px-1.5 sm:px-2">
                      Log in
                  </Link>
                  <Button href="/signup" className="whitespace-nowrap shrink-0 bg-[#0070F3] hover:bg-[#0060D0] text-white rounded-full px-4 sm:px-5 py-1.5 sm:py-2 font-medium h-9 sm:h-10 text-[13px] sm:text-[14px] shadow-sm border-none transition-colors">
                      <span className="hidden sm:inline">Create an account</span>
                      <span className="sm:hidden">Sign up</span>
                  </Button>
                </div>
            </div>
        </div>
      </nav>
      {/* --- 1. HERO SECTION (Original Design + Video Overlay) --- */}
      <section className="relative pt-18 md:pt-28 pb-0 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-[90vh] flex flex-col justify-center">
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
                   For engineers who learn on the job
                 </div>

                 <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-8 leading-tight ">
                   <span className="inline-block">Keep what you</span>
                   <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl mx-2 shadow-lg">
                     learn
                   </span>
                   <br className="hidden sm:block" />
                   <span className="inline-block">Find what you</span>
                   <span className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl mx-2 shadow-lg">
                     need
                   </span>
                 </h1>

                 <p className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] max-w-3xl mx-auto mb-12 leading-relaxed">
                   Recollect brings your notes back on a short daily list, keeps your goals honest and works with the
                   coding agents you already use. The commands you reach for every day are one click away.
                 </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative z-10 mt-8">
                    <Button
                      size="lg"
                      href="/signup"
                      className="bg-[#0070F3] hover:bg-[#0060D0] text-white rounded-md px-8 h-12 text-base font-semibold shadow-none border-none transition-colors w-full sm:w-auto"
                    >
                      Create an account
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="lg"
                      href="/login"
                      className="rounded-md px-6 h-12 text-base font-semibold border-border hover:bg-muted/50 transition-colors gap-2 w-full sm:w-auto"
                    >
                      Log in
                    </Button>
                  </div>
               </div>
             </div>
      </section>

      {/* --- 2. DOCS (The Editor) --- */}
      <section className="py-14 pt-16 md:pt-0 px-4 sm:px-6 relative bg-welcome-bg mt-8 md:mt-0">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="max-w-8xl mx-auto space-y-8 relative z-10">
                {/* Minimal Excalidraw-style Callout */}
                <div className="absolute top-[-30px] sm:top-[-58px] right-2 sm:right-8 md:right-16 lg:right-18 z-50 flex items-center pointer-events-none scale-75 sm:scale-100 origin-right">
                <div className="flex items-center gap-2 rotate-[-4deg]">
                    
                    {/* Sleek curved arrow */}
                    <svg className="w-[45px] h-[27px] text-indigo-400/90 " viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M 5 50 Q 40 5, 88 25"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                />
                <path
                    d="M 75 12 L 92 26 L 73 37"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                </svg>

                    <span
                    style={caveat.style}
                    className="text-2xl tracking-wide text-indigo-400/90 font-semibold whitespace-nowrap"
                    >
                    Ask AI in any doc
                    </span>

                    {/* Minimal heart */}
                    <svg
                    className="w-5 h-5 text-rose-400/80 mb-0.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>

                </div>
</div>
             <div className="relative w-full  pb-10">

                 <CinematicDocsViewer />
                 
             

                 <p className="text-center mt-8 text-lg font-lg text-muted-foreground max-w-3xl mx-auto">
                    Live editing, slash commands, diagrams and code, and an AI that edits with you, all in one doc.
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
                    Learning on the job leaks.
                </h2>
                <p className="text-xl md:text-xl text-muted-foreground max-w-2xl mx-auto drop-shadow-md">
                    You read it, you get it, and three weeks later it&apos;s gone.
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
                         <h3 className="text-xl font-bold text-foreground font-[family-name:var(--font-inter)] tracking-tight">Notes you never see again</h3>
                         <p className="text-muted-foreground text-sm mt-2 leading-relaxed">What you learn sits in docs you never reopen, so it fades before you need it.</p>
                     </div>
                </div>
                {/* Problem 2 */}
                <div className="p-6 rounded-2xl bg-[#FBFBFA] dark:bg-zinc-900/50 border border-border shadow-sm text-left flex flex-col items-start space-y-4 hover:-translate-y-1 transition-transform duration-300">
                     <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                         <CheckSquare className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-xl font-bold text-foreground font-[family-name:var(--font-inter)] tracking-tight">Plans that turn into guilt</h3>
                         <p className="text-muted-foreground text-sm mt-2 leading-relaxed">Rigid schedules pile up overdue items until opening the app feels like a debt.</p>
                     </div>
                </div>
                {/* Problem 3 */}
                <div className="p-6 rounded-2xl bg-[#FBFBFA] dark:bg-zinc-900/50 border border-border shadow-sm text-left flex flex-col items-start space-y-4 hover:-translate-y-1 transition-transform duration-300">
                     <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                         <LayoutList className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-xl font-bold text-foreground font-[family-name:var(--font-inter)] tracking-tight">Agents that forget</h3>
                         <p className="text-muted-foreground text-sm mt-2 leading-relaxed">Your coding agents teach you all day, and none of it is kept anywhere you&apos;ll look again.</p>
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
            <div className="max-w-5xl mx-auto mt-16 md:mt-20 pt-8 md:pt-12 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 text-left relative z-10">
                <div className="flex-1 space-y-4 md:space-y-5">
                     <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-foreground/70 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                        <Keyboard className="w-4 h-4" /> 
                        <span>Ctrl K</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight font-[family-name:var(--font-inter)]">
                        Capture without leaving what you&apos;re doing.
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                        Open it from anywhere to add a task, save a note or a link, find a saved command, or ask the AI, all from the keyboard.
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
      

      {/* --- YOUR AGENTS --- */}
      <section className="py-20 px-6 relative overflow-hidden bg-background">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="max-w-5xl mx-auto space-y-10 relative z-10">
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight text-foreground font-[family-name:var(--font-inter)]">
              Your agents keep it up to date.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Recollect has its own MCP server. Claude Code and other agents read your plan, write notes with real diagrams and log what
              you studied, through a token you can end at any time. Every change they make shows on Home and can be undone.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AGENT_POINTS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-6 rounded-2xl bg-[#FBFBFA] dark:bg-zinc-900/50 border border-border shadow-sm text-left flex flex-col items-start space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground font-[family-name:var(--font-inter)] tracking-tight">{title}</h3>
                  <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- WHAT HAPPENS TO YOUR NOTES --- */}
      <section className="py-16 md:py-20 px-6 relative z-10 bg-[#F4F4F2] dark:bg-zinc-900/40 border-t border-border/40">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-8 md:gap-12 items-start">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight text-foreground font-[family-name:var(--font-inter)]">
              What happens to your notes.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">Said plainly, so you can decide.</p>
          </div>
          <ul className="space-y-5">
            {DATA_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-4">
                <div className="mt-0.5 shrink-0 bg-background p-2 rounded-lg border border-border">
                  <Icon className="w-5 h-5 text-foreground/70" />
                </div>
                <p className="text-base text-foreground/85 leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --- FOOTER CTA --- */}
      <section className="relative py-24 md:py-30 md:pb-20 pb-10 px-6 border-t border-border overflow-hidden bg-background">
         <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-10 relative z-10">
            <h2 className="text-4xl md:text-7xl font-bold tracking-tighter text-foreground font-[family-name:var(--font-inter)]">
                Start keeping <br/> what you learn.
            </h2>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Built by one engineer for his own learning. You&apos;re welcome to use it too.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 pt-6 md:pt-8">
                <Button size="lg" variant="primary" href="/signup" className="h-16 px-12 text-xl rounded-full shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
                    Create an account
                </Button>
                <Button size="lg" variant="outline" href="/login" className="h-16 px-12 text-xl rounded-full bg-card/50 backdrop-blur-md border-border hover:bg-card text-foreground">
                    Log in
                </Button>
            </div>
            <div className="pt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground font-medium">
                <span>© 2026 Recollect</span>
                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
         </div>
      </section>

    </div>
  );
}
