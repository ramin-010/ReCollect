'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

const themes = [
  { id: 'light', label: 'Light', icon: Sun, desc: 'Clean & bright' },
  { id: 'dark', label: 'Dark', icon: Moon, desc: 'Notion-inspired' },
  { id: 'theme-dark-gray', label: 'Legacy', icon: Monitor, desc: 'Classic dark' },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Avoid hydration mismatch — only render the icon after mount
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <button className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))]">
        <Moon className="h-4 w-4" />
      </button>
    );
  }

  const current = themes.find(t => t.id === theme) ?? themes[1];
  const Icon = current.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(v => !v)}
        className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[var(--hover-bg)] transition-all duration-200"
        title={`Theme: ${current.label}`}
      >
        <Icon className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 min-w-[180px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-xl overflow-hidden"
            >
              <div className="p-1.5 space-y-0.5">
                {themes.map((t) => {
                  const T = t.icon;
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); setShowMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left
                        ${isActive
                          ? 'bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))]'
                          : 'text-[hsl(var(--foreground))] hover:bg-[var(--hover-bg)]'
                        }`}
                    >
                      <T className="h-4 w-4 shrink-0" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium leading-tight">{t.label}</span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">{t.desc}</span>
                      </div>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand-primary))]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
