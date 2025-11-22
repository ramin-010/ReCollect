// Logo.tsx - ReCollect Logo Variants
// 4 professional, modern logo designs

import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xll'
  showText?: boolean
  className?: string
  variant?: 'neural' | 'geometric' | 'infinity' | 'minimal'
}

const sizes = {
  sm: { icon: 20, text: 'text-lg' },
  md: { icon: 28, text: 'text-xl' },
  lg: { icon: 36, text: 'text-2xl' },
  xl: { icon: 48, text: 'text-3xl' },
  xll: { icon: 89, text: 'text-6xl' } // added
}


export const Logo: React.FC<LogoProps> = ({ 
  size = 'lg', 
  showText = true,
  className = ''
}) => {
  const currentSize = sizes[size]

  return (
    <div className={`flex items-center gap-0 ${className}`}>
      <svg
        width={currentSize.icon}
        height={currentSize.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Infinity symbol with gradient effect */}
        <path
          d="M16 24C16 19 19 16 22 16C25 16 26.5 17.5 28 19.5C29.5 17.5 31 16 34 16C37 16 40 19 40 24C40 29 37 32 34 32C31 32 29.5 30.5 28 28.5C26.5 30.5 25 32 22 32C19 32 16 29 16 24Z"
          fill="currentColor"
          className="text-brand-primary"
          opacity="0.15"
        />
        
        {/* Main infinity loop */}
        <path
          d="M16 24C16 19 19 16 22 16C25 16 26.5 17.5 28 19.5M28 19.5C29.5 17.5 31 16 34 16C37 16 40 19 40 24C40 29 37 32 34 32C31 32 29.5 30.5 28 28.5M28 28.5C26.5 30.5 25 32 22 32C19 32 16 29 16 24M28 19.5V28.5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand-primary"
        />
        
        {/* Memory dots on the path */}
        <circle cx="22" cy="16" r="2.5" fill="currentColor" className="text-brand-secondary" />
        <circle cx="34" cy="16" r="2.5" fill="currentColor" className="text-brand-secondary" />
        <circle cx="28" cy="24" r="3" fill="currentColor" className="text-brand-primary" />
        <circle cx="22" cy="32" r="2.5" fill="currentColor" className="text-brand-secondary" />
        <circle cx="34" cy="32" r="2.5" fill="currentColor" className="text-brand-secondary" />
      </svg>

      {showText && (
        <span className={`font-bold tracking-tight ${currentSize.text}`}>
          Re<span className="text-brand-primary">Collect</span>
        </span>
      )}
    </div>
  )
}