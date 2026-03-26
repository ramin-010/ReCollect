'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthSplitLayoutProps {
  children: ReactNode;
  heading: string;
  subheading: string;
}

const SLIDES = [
  {
    tagline: 'Your intelligent second brain',
    description: 'A unified workspace where your documents, tasks, and ideas seamlessly connect.',
  },
  {
    tagline: 'Real-time multiplayer collaboration',
    description: 'Co-write documents with your team using live cursors and instant cloud sync.',
  },
  {
    tagline: 'Work offline, sync effortlessly',
    description: 'Keep typing even when the internet drops. Changes are saved locally and synced automatically.',
  },
  {
    tagline: 'Deeply integrated AI assistance',
    description: 'Generate, rewrite, and summarize content instantly with intelligent inline AI.',
  },
];

/**
 * BrandLogo — faithful port of the AbstractDash.tsx brand reveal animation.
 */
function BrandLogo() {
  const [showLogo, setShowLogo] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Wait 1 full second after the container appears before mounting the SVG.
    timerRef.current = setTimeout(() => setShowLogo(true), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <motion.div
      className="flex items-center justify-center mb-2 overflow-visible"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <AnimatePresence mode="wait">
        {showLogo && (
          <motion.div
            key="logo-intro"
            className="flex items-center justify-center overflow-visible"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)', transition: { duration: 0.6 } }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Large logo with expanded viewBox so glow spreads freely */}
            <svg width="130" height="130" viewBox="6 6 44 44" className="bg-transparent relative top-6 overflow-visible" style={{ overflow: 'visible' }}>
              <defs>
                <filter id="auth-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="auth-infinity-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>

              {/* Infinity path — draws itself over 2.8s */}
              <motion.path
                d="M16 24C16 19 19 16 22 16C25 16 26.5 17.5 28 19.5M28 19.5C29.5 17.5 31 16 34 16C37 16 40 19 40 24C40 29 37 32 34 32C31 32 29.5 30.5 28 28.5M28 28.5C26.5 30.5 25 32 22 32C19 32 16 29 16 24M28 19.5V28.5"
                stroke="url(#auth-infinity-grad)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#auth-glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2.8, ease: 'easeInOut' }}
              />

              {/* Node dots — staggered pop-in */}
              <motion.circle cx="22" cy="16" r="1.5" fill="#a855f7"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5, ease: 'backOut' }} />
              <motion.circle cx="34" cy="16" r="1.5" fill="#3b82f6"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 1.0, duration: 0.5, ease: 'backOut' }} />
              <motion.circle cx="28" cy="24" r="2" fill="#ec4899"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 1.4, duration: 0.5, ease: 'backOut' }} />
              <motion.circle cx="22" cy="32" r="1.5" fill="#a855f7"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 1.8, duration: 0.5, ease: 'backOut' }} />
              <motion.circle cx="34" cy="32" r="1.5" fill="#3b82f6"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 2.2, duration: 0.5, ease: 'backOut' }} />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AuthSplitLayout({ children, heading, subheading }: AuthSplitLayoutProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    // Using a subtle surface background and placing the orbs on z-0
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-zinc-950 overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      <Link 
        href="/welcome" 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all z-40 group text-sm"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span className="font-medium">Back</span>
      </Link>
      
      {/* BACKGROUND ORBS & ANIMATED GRADIENT MESH */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[20%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
        
        {/* Animated Gradient Orbs */}
        <div className="absolute top-0 left-0 w-full h-full opacity-100">
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/30 to-transparent rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-fuchsia-400/30 to-blue-300/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-indigo-400/20 to-transparent rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        </div>
        {/* Dense Radial Circular Pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage: 'repeating-radial-gradient(circle at center, transparent, transparent 40px, hsl(var(--foreground)) 40px, hsl(var(--foreground)) 41px)'
          }}
        />

        {/* Subtle Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjgiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjYSkiLz48L3N2Zz4=')]" />
      </div>

      {/* Central Floating Card - Increased shadow for better pop */}
      <div className="w-full max-w-[1100px] relative z-20 bg-[#F4F4F2] dark:bg-zinc-950 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]  border border-black/[0.04] flex flex-col md:flex-row overflow-hidden min-h-[600px] lg:h-[630px]">
        
        {/* Left Side — Visual Showcase */}
        <div className="hidden md:flex md:w-1/2 p-3 lg:p-4">
          <div
            className="w-full h-full rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden"
            style={{
              // A subtle, sleek tinted background showing soft violet/indigo to bring out the noise
              background: 'linear-gradient(145deg, #EBEAFA 0%, #E3E4F6 40%, #DBDFFA 100%)',
            }}
          >
            {/* Noise texture — blending nicely onto the subtle color */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.25] mix-blend-multiply"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 512 512%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
              }}
            />

            {/* Animated ambient gradient — slow organic movement for glow */}
            <motion.div
              className="absolute inset-0 pointer-events-none opacity-50"
              animate={{
                background: [
                  'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 70% 70%, rgba(59,130,246,0.08) 0%, transparent 50%)',
                  'radial-gradient(ellipse 80% 60% at 60% 30%, rgba(59,130,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 30% 75%, rgba(236,72,153,0.08) 0%, transparent 50%)',
                  'radial-gradient(ellipse 80% 60% at 45% 60%, rgba(236,72,153,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 60% 25%, rgba(139,92,246,0.08) 0%, transparent 50%)',
                  'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 70% 70%, rgba(59,130,246,0.08) 0%, transparent 50%)',
                ],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />

            {/* Decorative concentric rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
              <div className="w-[500px] h-[500px] rounded-full border border-current" />
              <div className="absolute w-[350px] h-[350px] rounded-full border border-current" />
              <div className="absolute w-[200px] h-[200px] rounded-full border border-current" />
            </div>

            {/* Slide Content — perfectly centered in its container */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 px-8 lg:px-16 max-w-lg text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  className="flex flex-col items-center"
                >
                  <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#1C1C1E] mb-4 leading-tight">
                    {SLIDES[activeSlide].tagline}
                  </h2>
                  <p className="text-[#3A3A3D] text-base">
                    {SLIDES[activeSlide].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Slide Dots */}
            <div className="flex gap-2.5 pb-8 z-10">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === activeSlide
                      ? 'w-7 h-2.5 bg-[#1C1C1E]/60'
                      : 'w-2.5 h-2.5 bg-[#1C1C1E]/20 hover:bg-[#1C1C1E]/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side — Interactive Auth Form - Removed overflow-y-auto to fix unnecessary scrollbar */}
        <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden">
          {/* Very subtle accent wash */}
          <div
            className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none"
            style={{
              background: 'radial-gradient(circle at top right, rgba(139,92,246,0.03) 0%, transparent 60%)',
            }}
          />

          <div className="w-full max-w-[340px] py-4 relative z-10 mx-auto flex flex-col items-stretch justify-center">
            <div className="flex items-center justify-center h-[130px]">
              <BrandLogo />
            </div>

            <div className="mb-6 text-center w-full">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                {heading}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {subheading}
              </p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
