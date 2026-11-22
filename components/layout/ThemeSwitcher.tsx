'use client';

import React, { useEffect, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useWebLook, type WebLook } from '@/lib/webLook';

/** Light, Dark or System, then the look (Slate or Paper). "dark-gray" (legacy) is an alias of Dark in app/theme-v2.css. */
const themes = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
] as const;

/** The look (the owner, 11-22): Slate, theme v2's greys, or Paper, the phone app's cream; each light or dark. */
const looks: ReadonlyArray<{ id: WebLook; label: string; swatch: string }> = [
  { id: 'slate', label: 'Slate', swatch: 'linear-gradient(135deg, #f9f8f7 50%, #202020 50%)' },
  { id: 'paper', label: 'Paper', swatch: 'linear-gradient(135deg, #f5f0e6 50%, #24211c 50%)' },
];

/** A compact theme control for the sidebar footer: one icon button, a small menu that opens upward. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [look, setLook] = useWebLook();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  // Avoid a hydration mismatch: the stored theme is only known after mount.
  useEffect(() => setMounted(true), []);

  const currentId = theme === 'theme-dark-gray' ? 'dark' : theme;
  const current = themes.find((t) => t.id === currentId) ?? themes[1];
  const Icon = mounted ? current.icon : Moon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}. Change theme`}
        title="Theme"
        className="grid h-[30px] w-[30px] place-items-center rounded-[6px] text-[var(--ui-icon)] transition-colors hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]"
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            aria-label="Theme"
            className="absolute bottom-full right-0 z-50 mb-1.5 min-w-[164px] rounded-[10px] bg-[hsl(var(--popover))] p-[5px] shadow-[0_0_0_1px_var(--border-subtle),0_14px_28px_-6px_rgba(0,0,0,0.25),0_2px_6px_rgba(0,0,0,0.08)]"
          >
            {themes.map((t) => {
              const T = t.icon;
              const active = currentId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className="flex h-[30px] w-full items-center gap-2 rounded-[6px] px-2 text-left text-[14px] text-[var(--ui-ink-1)] transition-colors hover:bg-[var(--ui-hover)]"
                >
                  <T className="h-4 w-4 shrink-0 text-[var(--ui-icon)]" strokeWidth={1.75} />
                  <span className="flex-1">{t.label}</span>
                  {active && <Check className="h-4 w-4 text-[var(--ui-ink-2)]" strokeWidth={2} />}
                </button>
              );
            })}
            <div className="mx-2 my-[5px] h-px bg-[var(--border-subtle)]" role="separator" />
            {looks.map((l) => {
              const active = mounted && look === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setLook(l.id);
                    setOpen(false);
                  }}
                  className="flex h-[30px] w-full items-center gap-2 rounded-[6px] px-2 text-left text-[14px] text-[var(--ui-ink-1)] transition-colors hover:bg-[var(--ui-hover)]"
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center" aria-hidden>
                    <span className="h-[13px] w-[13px] rounded-full shadow-[0_0_0_1px_var(--border-strong)]" style={{ background: l.swatch }} />
                  </span>
                  <span className="flex-1">{l.label}</span>
                  {active && <Check className="h-4 w-4 text-[var(--ui-ink-2)]" strokeWidth={2} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
