'use client';

import React, { useState, useEffect } from 'react';

interface FlipClockProps {
  className?: string;
  scale?: number;
  transparent?: boolean;
  showSeconds?: boolean;
}

// Two-digit card component with flip animation
function FlipCard({ value, scale = 1, transparent = false }: { value: string; scale?: number; transparent?: boolean }) {
  const [currentValue, setCurrentValue] = useState(value);
  const [animatingFrom, setAnimatingFrom] = useState<string | null>(null);

  useEffect(() => {
    if (value !== currentValue) {
      setAnimatingFrom(currentValue);
      const topTimer = setTimeout(() => setCurrentValue(value), 300);
      const endTimer = setTimeout(() => setAnimatingFrom(null), 600);
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
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0px',
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%) scaleY(1.3)',
    whiteSpace: 'nowrap',
    textShadow: transparent ? 'none' : '0 4px 12px rgba(0,0,0,0.5)', 
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
  const cutOffset = 8 * scale; 
  const topHeight = `calc(50% + ${cutOffset}px)`;
  const bottomHeight = `calc(50% - ${cutOffset}px)`;
  const textOffsetMargin = `-${cutOffset}px`;

  // Explicit border for the cut, even in transparent mode, so it's visible on the text
  const cutBorder = '1px solid rgba(0,0,0,0.1)';

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
          animation: flipDown 400ms ease-in forwards;
        }
        
        .flip-bottom-animation {
          transform: rotateX(90deg);
          animation: flipUp 400ms ease-out 400ms forwards;
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

export function FlipClock({ className = '', scale = 1, transparent = false, showSeconds = false }: FlipClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  
  // Convert 24h to 12h format
  const h12 = hours % 12 || 12;

  const hoursStr = String(h12).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
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
        <FlipCard value={hoursStr} scale={scale} transparent={transparent} />
        <FlipCard value={minutesStr} scale={scale} transparent={transparent} />
        {showSeconds && (
          <FlipCard value={secondsStr} scale={scale} transparent={transparent} />
        )}
      </div>
    </div>
  );
}
