'use client';

// The brand sheet (KAAGA_REBRAND_PLAN): every size and state of the mark, the logo and the wordmark, on ink and on
// paper, so a change to the brand components is checked in one place. Plays each state again on "Play again".
import { useState } from 'react';
import { KaagaLogo, KaagaMark, KaagaWordmark, type KaagaState } from '@/components/brand/kaaga';

const STATES: Array<{ state: KaagaState; once?: boolean; what: string }> = [
  { state: 'still', what: 'The mark: chrome, headers, avatars' },
  { state: 'idle', what: 'Waiting, slowly (a splash that waits)' },
  { state: 'thinking', what: 'Kaaga is working: an answer is coming' },
  { state: 'noted', once: true, what: 'Something was saved (plays once)' },
  { state: 'call', once: true, what: 'Kaaga has something to say (plays once)' },
  { state: 'reveal', what: 'A first open: the slices arrive' },
];

const PANES = [
  { name: 'Paper', bg: '#F1EEE7', ink: '#141416' },
  { name: 'Ink', bg: '#141416', ink: '#ECE9E2' },
];

export default function BrandSheet() {
  const [round, setRound] = useState(0);
  return (
    <div className="mx-auto max-w-[1080px] px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="rc-h1">Brand</h1>
        <button type="button" className="rc-btn" onClick={() => setRound((r) => r + 1)}>
          Play again
        </button>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {PANES.map((p) => (
          <section key={p.name} className="rounded-[14px] p-6" style={{ background: p.bg, color: p.ink }}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] opacity-60">{p.name}</p>
            <div className="mt-5 flex items-end gap-5">
              {[16, 20, 24, 32, 48, 96].map((s) => (
                <KaagaMark key={s} size={s} />
              ))}
            </div>
            <div className="mt-7 flex flex-col gap-5">
              <KaagaLogo height={36} variant="header" />
              <KaagaLogo height={22} variant="sidebar" />
              <KaagaWordmark height={28} />
            </div>
            <div className="mt-8 flex flex-col gap-4">
              {STATES.map((s) => (
                <div key={s.state} className="flex items-center gap-4">
                  <KaagaMark key={`${s.state}-${round}`} size={40} state={s.state} once={s.once} />
                  <KaagaMark key={`${s.state}-s-${round}`} size={20} state={s.state} once={s.once} />
                  <div>
                    <p className="text-[14px] font-semibold">{s.state}</p>
                    <p className="text-[13px] opacity-65">{s.what}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
