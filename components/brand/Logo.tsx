// The older pages' logo (the landing, legal pages, shares, the slides): since 11-26 it draws Kaaga's (KAAGA_REBRAND_PLAN),
// keeping the old sizes and props so every page that used it changes at once.
import React from 'react';
import { KaagaLogo, KaagaMark } from './kaaga';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xll';
  showText?: boolean;
  className?: string;
  /** Kept for older callers; there is one logo now. */
  variant?: 'neural' | 'geometric' | 'infinity' | 'minimal';
}

const HEIGHTS = { sm: 20, md: 24, lg: 30, xl: 40, xll: 72 } as const;

export const Logo: React.FC<LogoProps> = ({ size = 'lg', showText = true, className = '' }) => {
  const h = HEIGHTS[size];
  return (
    <div className={`inline-flex items-center ${className}`}>
      {showText ? <KaagaLogo height={h} variant={h <= 24 ? 'sidebar' : 'header'} /> : <KaagaMark size={h} label="Kaaga" />}
    </div>
  );
};

export default Logo;
