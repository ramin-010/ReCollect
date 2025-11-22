// Custom Textarea Component - No ShadCN
import React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-light))] px-3 py-2',
            'text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]',
            'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-primary))] focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-y transition-colors',
            error && 'border-[hsl(var(--destructive))] focus:ring-[hsl(var(--destructive))]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[hsl(var(--destructive))] mt-1">{error}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
