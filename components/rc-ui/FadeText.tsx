'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * One line of text that fades at its edge only when it doesn't fit (DESIGN: never "…").
 * The `.ui-fade-end` mask would otherwise also fade a short title's last letters.
 */
export function FadeText({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOver(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);
  return (
    <span ref={ref} title={over ? title : undefined} className={cn('block min-w-0 overflow-hidden whitespace-nowrap', over && 'ui-fade-end', className)}>
      {children}
    </span>
  );
}
