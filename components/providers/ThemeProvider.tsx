// ReCollect Theme Provider - Supporting 4 professional themes
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      themes={['light', 'dark', 'theme-gray', 'theme-dark-gray']}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}