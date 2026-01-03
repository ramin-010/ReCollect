// Custom DropdownMenu Component - With Portal Support
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface DropdownMenuProps {
  children: React.ReactNode
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  
  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen, triggerRect, setTriggerRect, triggerRef }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  triggerRect: DOMRect | null
  setTriggerRect: (rect: DOMRect | null) => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
}>({
  isOpen: false,
  setIsOpen: () => {},
  triggerRect: null,
  setTriggerRect: () => {},
  triggerRef: { current: null },
})

export const useDropdownMenu = () => React.useContext(DropdownMenuContext)

export interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ 
  asChild, 
  children 
}) => {
  const { isOpen, setIsOpen, setTriggerRect, triggerRef } = useDropdownMenu()
  const localRef = useRef<HTMLButtonElement>(null)
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const element = localRef.current || (e.currentTarget as HTMLElement)
    if (element) {
      triggerRef.current = element
      setTriggerRect(element.getBoundingClientRect())
    }
    setIsOpen(!isOpen)
  }
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      ref: (node: HTMLElement) => {
        triggerRef.current = node
        // Handle any existing ref on the child
        const { ref } = children as any
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }
    })
  }
  
  return (
    <button ref={localRef} onClick={handleClick}>
      {children}
    </button>
  )
}

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = 'end', sideOffset = 4, children, ...props }, ref) => {
    const { isOpen, setIsOpen, triggerRect, triggerRef } = useDropdownMenu()
    const contentRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
      setMounted(true)
    }, [])
    
    useEffect(() => {
      if (!isOpen) return
      
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node
        if (
          contentRef.current && 
          !contentRef.current.contains(target) &&
          triggerRef.current &&
          !triggerRef.current.contains(target)
        ) {
          setIsOpen(false)
        }
      }
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false)
        }
      }
      
      const handleScroll = () => {
        setIsOpen(false)
      }
      
      // Small delay to prevent immediate closing
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
        window.addEventListener('scroll', handleScroll, true)
      }, 0)
      
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }, [isOpen, setIsOpen, triggerRef])
    
    if (!isOpen || !triggerRect || !mounted) return null
    
    // Calculate position
    let left = triggerRect.left
    let top = triggerRect.bottom + sideOffset
    
    if (align === 'end') {
      left = triggerRect.right
    } else if (align === 'center') {
      left = triggerRect.left + triggerRect.width / 2
    }
    
    const content = (
      <div
        ref={contentRef}
        className={cn(
          'fixed z-[9999] min-w-[8rem] overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-lg text-[hsl(var(--foreground))]',
          'animate-fade-in',
          className
        )}
        style={{
          top: `${top}px`,
          left: align === 'end' ? 'auto' : `${left}px`,
          right: align === 'end' ? `${window.innerWidth - triggerRect.right}px` : 'auto',
          transform: align === 'center' ? 'translateX(-50%)' : 'none',
        }}
        {...props}
      >
        {children}
      </div>
    )
    
    return createPortal(content, document.body)
  }
)

DropdownMenuContent.displayName = 'DropdownMenuContent'

export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean
}

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, destructive, onClick, children, ...props }, ref) => {
    const { setIsOpen } = useDropdownMenu()
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      if (!e.defaultPrevented) {
        setIsOpen(false)
      }
    }
    
    return (
      <button
        ref={ref}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none',
          'transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
          'focus:bg-[hsl(var(--accent))] focus:text-[hsl(var(--accent-foreground))]',
          'disabled:pointer-events-none disabled:opacity-50',
          destructive && 'text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] focus:text-[hsl(var(--destructive))]',
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)

DropdownMenuItem.displayName = 'DropdownMenuItem'

export const DropdownMenuSeparator: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn('my-1 h-px bg-[hsl(var(--border))]', className)}
      {...props}
    />
  )
}

export const DropdownMenuLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('px-2 py-1.5 text-sm font-semibold text-[hsl(var(--foreground))]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Submenu Context
const DropdownMenuSubContext = React.createContext<{
  isSubOpen: boolean
  setIsSubOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLDivElement | null> | null
}>({
  isSubOpen: false,
  setIsSubOpen: () => {},
  triggerRef: null,
})

export const DropdownMenuSub: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSubOpen, setIsSubOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  
  return (
    <DropdownMenuSubContext.Provider value={{ isSubOpen, setIsSubOpen, triggerRef }}>
      <div 
        ref={triggerRef}
        className="relative"
        onMouseEnter={() => setIsSubOpen(true)}
        onMouseLeave={() => setIsSubOpen(false)}
      >
        {children}
      </div>
    </DropdownMenuSubContext.Provider>
  )
}

export interface DropdownMenuSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuSubTrigger: React.FC<DropdownMenuSubTriggerProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none',
        'transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
        className
      )}
      {...props}
    >
      {children}
      <svg 
        className="ml-auto h-4 w-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}

export interface DropdownMenuSubContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuSubContent: React.FC<DropdownMenuSubContentProps> = ({
  className,
  children,
  ...props
}) => {
  const { isSubOpen, triggerRef, setIsSubOpen } = React.useContext(DropdownMenuSubContext)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  
  useEffect(() => {
    if (isSubOpen && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top,
        left: rect.right + 4,
      })
    }
  }, [isSubOpen, triggerRef])
  
  if (!isSubOpen) return null
  
  return createPortal(
    <div
      className={cn(
        'fixed min-w-[8rem] overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-lg text-[hsl(var(--foreground))]',
        'animate-fade-in z-[10001]',
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseEnter={() => setIsSubOpen(true)}
      onMouseLeave={() => setIsSubOpen(false)}
      {...props}
    >
      {children}
    </div>,
    document.body
  )
}