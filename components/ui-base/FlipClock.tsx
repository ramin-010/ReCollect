'use client';

import React, { useState, useEffect } from 'react';

interface FlipClockProps {
  className?: string;
  scale?: number;
  transparent?: boolean;
  showSeconds?: boolean;
  mode?: 'clock' | 'stopwatch'; // Controlled mode
}

// Two-digit card component with flip animation
function FlipCard({ value, scale = 1, transparent = false }: { value: string; scale?: number; transparent?: boolean }) {
  const [currentValue, setCurrentValue] = useState(value);
  const [animatingFrom, setAnimatingFrom] = useState<string | null>(null);

  useEffect(() => {
    if (value !== currentValue) {
      setAnimatingFrom(currentValue);
      const topTimer = setTimeout(() => setCurrentValue(value), 700);
      const endTimer = setTimeout(() => setAnimatingFrom(null), 1200);
      return () => { clearTimeout(topTimer); clearTimeout(endTimer); };
    }
  }, [value, currentValue]);

  const isAnimating = animatingFrom !== null;

  const textStyle: React.CSSProperties = {
    fontSize: `clamp(${60 * scale}px, ${20 * scale}vw, ${250 * scale}px)`,
    fontWeight: 700,
    color: 'currentColor', // Use parent color
    fontFamily: "'Oswald', 'Impact', sans-serif",
    lineHeight: 1,
    letterSpacing: '0px',
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%) scaleY(1.3)',
    whiteSpace: 'nowrap',
    textShadow: transparent ? 'none' : '0 4px 12px rgba(0,0,0,0.5)', 
    width: '100%',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
  };
  
  const halfStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    background: transparent ? 'transparent' : '#151515', 
    backdropFilter: 'none', 
  };
  
  // Cut offset to move the line down visually (relative to text)
  // We make top half taller, bottom half shorter.
  // BUT we must shift text UP by the same amount so it stays centered in the CARD,
  // effectively moving the cut DOWN through the text.
  const cutOffset = 18 * scale; 
  const topHeight = `calc(50% + ${cutOffset}px)`;
  const bottomHeight = `calc(50% - ${cutOffset}px)`;
  const textOffsetMargin = `-${cutOffset}px`;

  // Explicit border for the cut, even in transparent mode, so it's visible on the text
  const cutBorder = scale < 1 ? '1px solid rgba(0,0,0,0.1)' : '2px solid rgba(0,0,0,0.1)';

  return (
    <div className="relative" style={{ perspective: '1000px' }}>
      <div 
        style={{ 
          position: 'relative',
          width: `clamp(${100 * scale}px, ${22 * scale}vw, ${300 * scale}px)`,
          aspectRatio: '1 / 1.1',
          background: transparent ? 'transparent' : '#151515',
          borderRadius: `${12 * scale}px`,
          overflow: 'hidden',
          boxShadow: transparent ? 'none' : '0 4px 10px rgba(0,0,0,0.3)',
        }}
      >
        {/* Static TOP */}
        <div style={{ ...halfStyle, height: topHeight, top: 0, zIndex: 1, borderBottom: cutBorder }}>
          <span style={{ ...textStyle, top: '100%', marginTop: textOffsetMargin }}>{currentValue}</span>
        </div>
        
        {/* Static BOTTOM */}
        <div style={{ ...halfStyle, height: bottomHeight, bottom: 0, top: 'auto', zIndex: 1, borderTop: cutBorder }}>
          <span style={{ ...textStyle, top: '0%', marginTop: textOffsetMargin }}>{currentValue}</span>
        </div>

        {/* Animated TOP flap */}
        <div 
          key={`top-${animatingFrom || currentValue}`}
          className={isAnimating ? "flip-top-animation" : ""}
          style={{ 
            ...halfStyle, 
            height: topHeight,
            borderBottom: cutBorder,
            top: 0, 
            zIndex: isAnimating ? 3 : 0,
            transformOrigin: 'bottom center',
            backfaceVisibility: 'hidden',
            opacity: isAnimating ? 1 : 0,
            transform: isAnimating ? undefined : 'rotateX(-90deg)',
             // Pure transparent in transparent mode to avoid "box" effect
             backgroundColor: (transparent ? 'transparent' : halfStyle.background) as string
          }}
        >
          <span style={{ ...textStyle, top: '100%', marginTop: textOffsetMargin }}>{animatingFrom || currentValue}</span>
        </div>
        
        {/* Animated BOTTOM flap */}
        {isAnimating && (
          <div 
            key={`bottom-${value}`}
            className="flip-bottom-animation"
            style={{ 
              ...halfStyle, 
              height: bottomHeight,
              bottom: 0,
              borderTop: cutBorder, 
              top: 'auto',
              zIndex: 2,  
              transformOrigin: 'top center',
              backfaceVisibility: 'hidden',
              // Pure transparent in transparent mode
              backgroundColor: (transparent ? 'transparent' : halfStyle.background) as string
            }}
          >
            <span style={{ ...textStyle, top: '0%', marginTop: textOffsetMargin }}>{value}</span>
          </div>
        )}
        
        {/* Center line - Remove in transparent mode */}
        {!transparent && <div 
          style={{ 
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: `${4 * scale}px`,
            background: 'rgba(0,0,0,0.3)', 
            transform: 'translateY(-50%)',
            zIndex: 10,
          }}
        />}
      </div>

      <style jsx global>{`
        .flip-top-animation {
          animation: flipDown 500ms ease-in forwards;
        }
        
        .flip-bottom-animation {
          transform: rotateX(90deg);
          animation: flipUp 500ms ease-out 500ms forwards !important;
        }
        
        @keyframes flipDown {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-90deg); }
        }
        
        @keyframes flipUp {
          0% { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }
      `}</style>
    </div>
  );
}

export function FlipClock({ className = '', scale = 1, transparent = false, showSeconds = false, mode = 'clock' }: FlipClockProps) {
  const [time, setTime] = useState(new Date());
  
  // Stopwatch state
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Clock tick
  useEffect(() => {
    if (mode === 'clock') {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }
  }, [mode]);

  // Stopwatch tick
  useEffect(() => {
    let animationFrame: number;
    
    if (mode === 'stopwatch' && isRunning && startTime !== null) {
      const updateTimer = () => {
        const now = Date.now();
        setElapsedTime(now - startTime);
        animationFrame = requestAnimationFrame(updateTimer);
      };
      animationFrame = requestAnimationFrame(updateTimer);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [mode, isRunning, startTime]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const handleStartStop = () => {
    if (isRunning) {
      // Pause
      setIsRunning(false);
      setStartTime(null); 
    } else {
      // Start
      setIsRunning(true);
      setStartTime(Date.now() - elapsedTime);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  // Get display values
  let displayHours, displayMinutes, displaySeconds;

  if (mode === 'clock') {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const seconds = time.getSeconds();
      const h12 = hours % 12 || 12;
      displayHours = String(h12).padStart(2, '0');
      displayMinutes = String(minutes).padStart(2, '0');
      displaySeconds = String(seconds).padStart(2, '0');
  } else {
      // Stopwatch formatting
      const totalSeconds = Math.floor(elapsedTime / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      
      displayHours = String(h).padStart(2, '0');
      displayMinutes = String(m).padStart(2, '0');
      displaySeconds = String(s).padStart(2, '0');
  }

  return (
    <div className={`relative flex flex-col items-center justify-center group ${className}`}>
        <div className="relative flex items-center justify-center">
            {/* Removed background line in transparent mode */}
            {!transparent && <div 
                style={{ 
                position: 'absolute',
                left: '-50vw',
                right: '-50vw',
                top: '50%',
                height: `${4 * scale}px`,
                background: '#0a0a0a',
                zIndex: 0,
                }}
            />}
            
            {/* Cards */}
            <div className={`flex relative z-10`} style={{ gap: `${(transparent ? 24 : 16) * scale}px` }}>
                <FlipCard value={displayHours} scale={scale} transparent={transparent} />
                <FlipCard value={displayMinutes} scale={scale} transparent={transparent} />
                {(showSeconds || mode === 'stopwatch') && (
                <FlipCard value={displaySeconds} scale={scale} transparent={transparent} />
                )}
            </div>
        </div>

        {/* Controls Overlay - Persistent in Stopwatch Mode */}
        {mode === 'stopwatch' && (
        <div 
            className="absolute top-1/2 -translate-y-1/2 -right-16 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300"
            style={{ zIndex: 100 }}
        >
            <div className="flex flex-col items-center bg-black/60 backdrop-blur-md rounded-xl p-1.5 border border-white/10 shadow-xl gap-2">
                 <button
                    onClick={handleStartStop}
                    className={`p-1.5 rounded-lg transition-all ${isRunning ? 'text-red-400 hover:bg-red-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'}`}
                    title={isRunning ? 'Stop' : 'Start'}
                 >
                    {isRunning ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    )}
                 </button>
                 
                 <button
                    onClick={handleReset}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:rotate-180 transition-all"
                    title="Reset"
                 >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" />
                    </svg>
                 </button>
            </div>
        </div>
        )}
    </div>
  );
}
