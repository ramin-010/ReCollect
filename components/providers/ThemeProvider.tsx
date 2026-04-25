'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { usePathname } from 'next/navigation';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const pathname = usePathname();
  
  // Force light theme on these specific routes
  const forceLightPaths = ['/welcome', '/login', '/signup', '/signin'];
  const isLightForcedPath = forceLightPaths.some(
    path => pathname === path || pathname?.startsWith(`${path}/`)
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="theme-dark-gray"
      enableSystem
      themes={['light', 'dark', 'theme-dark-gray']}
      disableTransitionOnChange
      forcedTheme={isLightForcedPath ? 'light' : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}