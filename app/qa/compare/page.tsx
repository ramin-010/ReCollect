'use client';

/**
 * QA only: "Compare with design" on a desktop (PHONE_APP_REDESIGN_PLAN §7, the owner's final review). The approved
 * mock-up and the matching app screen side by side, each at the phone's size (360 by 780), in the same look. The
 * look is the device's own (the app frame follows it live; the mock-up loads again in it).
 */
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { designUrl, qaEnabled } from '@/lib/qa';
import { useLook, type Look } from '@/components/phone/look';

const SCREENS = [
  ['today', 'Today'],
  ['buddy', 'Kaaga'],
  ['library', 'Library'],
  ['you', 'You'],
  ['settings', 'Settings'],
  ['look', 'Look'],
] as const;
const LOOKS: Array<[Look['theme'], 'light' | 'dark', string]> = [
  ['paper', 'light', 'Paper, light'],
  ['paper', 'dark', 'Paper, dark'],
  ['slate', 'light', 'Slate, light'],
  ['slate', 'dark', 'Slate, dark'],
];

const frame: React.CSSProperties = { width: 360, height: 780, border: 0, borderRadius: 28, boxShadow: '0 0 0 1px rgba(0,0,0,.12), 0 24px 60px rgba(0,0,0,.18)', background: '#fff' };
const label: React.CSSProperties = { font: '600 13px system-ui, sans-serif', color: '#5F5E59', margin: '0 0 10px 4px' };

function Compare() {
  const params = useSearchParams();
  const [screen, setScreen] = useState(params.get('screen') ?? 'today');
  const { look, mode, save } = useLook();

  if (!qaEnabled()) return <p style={{ padding: 40, font: '15px system-ui' }}>Not found.</p>;
  return (
    <div style={{ minHeight: '100vh', background: mode === 'dark' ? '#0D0C0B' : '#E9E6E0', padding: '24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', font: '14px system-ui, sans-serif' }}>
        {SCREENS.map(([key, name]) => (
          <button key={key} type="button" onClick={() => setScreen(key)} style={{ padding: '8px 14px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, background: screen === key ? '#23201B' : '#FCF9F3', color: screen === key ? '#FCF9F3' : '#23201B' }}>
            {name}
          </button>
        ))}
        <span style={{ width: 18 }} />
        {LOOKS.map(([theme, m, name]) => {
          const on = look.theme === theme && mode === m;
          return (
            <button key={name} type="button" onClick={() => save({ theme, mode: m })} style={{ padding: '8px 14px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, background: on ? '#28489B' : '#FCF9F3', color: on ? '#FFFFFF' : '#23201B' }}>
              {name}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
        <div>
          <p style={label}>The approved design</p>
          {/* The mock-up reads its look from its address once: a new key loads it again in a new look or screen. */}
          <iframe key={`d-${screen}-${look.theme}-${mode}`} title="The approved design" src={designUrl(screen, look.theme, mode)} style={frame} />
        </div>
        <div>
          <p style={label}>The app, on your data</p>
          <iframe key={`a${screen}`} title="The app" src={`/m/${screen}`} style={frame} />
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <Compare />
    </Suspense>
  );
}
