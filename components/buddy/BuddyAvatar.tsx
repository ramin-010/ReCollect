'use client';

// The buddy's face (KAAGA_REBRAND_PLAN D2): the buddy is Kaaga unless the user named it, so its face is the Kaaga
// mark on the main colour (the app icon in small); a buddy with a name of its own keeps the name's first letter.
// `state` lets the face work while it thinks, or slide its slice out once when it has something new to say.
import { KaagaMark, type KaagaState } from '@/components/brand/kaaga';
import { isKaaga } from '@/lib/brand';
import { cn } from '@/lib/utils';

export function BuddyAvatar({
  name,
  size = 22,
  state = 'still',
  once = false,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  state?: KaagaState;
  once?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full bg-[var(--rc-main)] font-[700] text-[var(--rc-on-main)]', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      aria-hidden
    >
      {isKaaga(name) ? <KaagaMark size={Math.round(size * 0.66)} state={state} once={once} /> : name!.trim().charAt(0).toUpperCase()}
    </span>
  );
}
