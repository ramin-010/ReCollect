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
      // Theme v2: Light, Dark or System. 'theme-dark-gray' stays only so a stored legacy choice still
      // resolves; app/theme-v2.css makes it an alias of the new dark.
      defaultTheme="dark"
      enableSystem
      themes={['light', 'dark', 'theme-dark-gray']}
      disableTransitionOnChange
      forcedTheme={isLightForcedPath ? 'light' : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}