// Tabs - thin wrapper over @radix-ui/react-tabs (keyboard navigation + ARIA), styled with the theme tokens.
'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn('flex items-center', className)} {...props} />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/**
 * Default look: an uppercase text tab (Revise's dashboard headers). Pass `className` for a
 * pill/segmented look; the active state is exposed as `data-[state=active]`.
 */
export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold uppercase tracking-wider outline-none transition-colors',
      'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
      'data-[state=active]:text-[hsl(var(--foreground))]',
      'focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-0 rounded-sm',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('outline-none', className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
