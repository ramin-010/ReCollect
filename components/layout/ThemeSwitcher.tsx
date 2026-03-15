// ReCollect - Theme Switcher with Custom Components
'use client';

import React, { useState } from 'react';
import { Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui-base/Button';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const themes = [
    { id: 'light' as const, label: 'Light', icon: Sun },
    { id: 'theme-dark-gray' as const, label: 'Dark', icon: Moon },
  ];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        {theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-30 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg p-2 min-w-48">
            {themes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    theme === t.id
                      ? 'bg-[hsl(var(--sidebar-hover))] text-[hsl(var(--foreground))] font-medium'
                      : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sidebar-hover))]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
