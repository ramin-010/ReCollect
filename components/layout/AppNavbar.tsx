import React from 'react';
import { Logo } from '@/components/brand/Logo';

interface AppNavbarProps {
  title: string;
  description: string;
}

export function AppNavbar({ title, description }: AppNavbarProps) {
  return (
    <div className="max-w-[1300px] mx-auto flex items-center justify-between mb-4">
      {/* Left Side: Logo + Title + Description */}
      <div className="flex items-center gap-4">
        <Logo size="xll" showText={false} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {title}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            {description}
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
      </div>
    </div>
  );
}
