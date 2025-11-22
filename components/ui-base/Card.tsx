// Custom Card Component - No ShadCN
import React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'interactive'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    
    const baseStyles = 'rounded-xl transition-all duration-200'
    
    const variants = {
      default: 'bg-[hsl(var(--card))] border border-[hsl(var(--border))]',
      outlined: 'bg-transparent border-2 border-[hsl(var(--border))]',
      elevated: 'bg-[hsl(var(--card))] shadow-lg border border-[hsl(var(--border))]/50',
      interactive: 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:shadow-md hover:border-[hsl(var(--border))]/70 cursor-pointer'
    }
    
    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-7'
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card Header
export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div 
      className={cn("pb-4 border-b border-[hsl(var(--border))]", className)} 
      {...props}
    >
      {children}
    </div>
  )
}

// Card Title
export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h3 
      className={cn("text-lg font-semibold text-[hsl(var(--foreground))]", className)} 
      {...props}
    >
      {children}
    </h3>
  )
}

// Card Description
export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <p 
      className={cn("text-sm text-[hsl(var(--muted-foreground))] mt-1", className)} 
      {...props}
    >
      {children}
    </p>
  )
}

// Card Content
export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div 
      className={cn("pt-4", className)} 
      {...props}
    >
      {children}
    </div>
  )
}

// Card Footer
export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div 
      className={cn("pt-4 mt-4 border-t border-[hsl(var(--border))] flex items-center", className)} 
      {...props}
    >
      {children}
    </div>
  )
}
