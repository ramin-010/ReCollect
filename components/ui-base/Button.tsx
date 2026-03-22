// Custom Button Component - No ShadCN
import React from 'react'
import { cn } from '@/lib/utils'

import Link from 'next/link'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  href?: string
  target?: string
  rel?: string
}

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    children,
    href,
    target,
    rel,
    ...props 
  }, ref) => {
    
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none  focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90 focus:ring-[hsl(var(--primary))]',
      secondary: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]/80 focus:ring-[hsl(var(--secondary))]',
      ghost: 'hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus:ring-[hsl(var(--accent))]',
      outline: 'border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--foreground))] focus:ring-[hsl(var(--accent))]',
      danger: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90 focus:ring-[hsl(var(--destructive))]'
    }
    
    const sizes = {
      sm: 'text-sm h-9 px-3 gap-1.5',
      md: 'text-base h-[44px] px-6 gap-2',
      lg: 'text-lg h-[52px] px-8 gap-2.5'
    }

    const computedClass = cn(
      baseStyles,
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    )

    const InnerContent = () => (
      <>
        {isLoading ? (
          <>
            <span className="animate-spin">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </span>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </>
    )

    if (href && !disabled && !isLoading) {
      const isExternal = href.startsWith('http') || target === '_blank';
      if (isExternal) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            target={target}
            rel={rel || (target === '_blank' ? 'noopener noreferrer' : undefined)}
            className={computedClass}
            // Cannot spread all button props to anchor safely without filtering in TS, 
            // but we selectively pass standard handlers if needed. 
            onClick={props.onClick as any}
          >
            <InnerContent />
          </a>
        )
      }
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={computedClass}
          onClick={props.onClick as any}
        >
          <InnerContent />
        </Link>
      )
    }
    
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={computedClass}
        disabled={disabled || isLoading}
        {...props}
      >
        <InnerContent />
      </button>
    )
  }
)

Button.displayName = 'Button'
