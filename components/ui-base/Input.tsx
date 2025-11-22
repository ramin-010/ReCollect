// Custom Input Component - No ShadCN
import React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  inputSize?: 'sm' | 'md' | 'lg'
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text',
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    inputSize = 'md',
    ...props 
  }, ref) => {
    
    const sizes = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-base px-4 py-2',
      lg: 'text-lg px-5 py-3'
    }

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    }
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1.5 text-[hsl(var(--foreground))]">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] pointer-events-none",
              iconSizes[inputSize]
            )}>
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            type={type}
            className={cn(
              "w-full rounded-lg border bg-[hsl(var(--surface-light))] text-[hsl(var(--foreground))]",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-primary))] focus:border-transparent",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error ? "border-[hsl(var(--destructive))]" : "border-[hsl(var(--border))]",
              sizes[inputSize],
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            {...props}
          />
          
          {rightIcon && (
            <div className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]",
              iconSizes[inputSize]
            )}>
              {rightIcon}
            </div>
          )}
        </div>
        
        {hint && !error && (
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{hint}</p>
        )}
        
        {error && (
          <p className="mt-1 text-sm text-[hsl(var(--destructive))]">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea variant
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  textAreaSize?: 'sm' | 'md' | 'lg'
}
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ 
    className, 
    label,
    error,
    hint,
    textAreaSize = 'md',
    ...props 
  }, ref) => {
    
    const sizes = {
      sm: 'text-sm px-3 py-2',
      md: 'text-base px-4 py-3',
      lg: 'text-lg px-5 py-4'
    }
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1.5 text-[hsl(var(--foreground))]">
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          className={cn(
            "w-full rounded-lg border bg-[hsl(var(--surface-light))] text-[hsl(var(--foreground))]",
            "transition-all duration-200 resize-none",
            "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-primary))] focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-[hsl(var(--destructive))]" : "border-[hsl(var(--border))]",
            sizes[textAreaSize],
            className
          )}
          {...props}
        />
        
        {hint && !error && (
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{hint}</p>
        )}
        
        {error && (
          <p className="mt-1 text-sm text-[hsl(var(--destructive))]">{error}</p>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'
