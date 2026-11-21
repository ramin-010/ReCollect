'use client';

/**
 * Look (PHONE_APP_REDESIGN_PLAN §2, §5, §8): Paper or Slate, light, dark or the system's, kept on this device. Inside the
 * phone app (step 5) also each screen's wallpaper (stage 11, his decision 4: the lock and home screens each our design in
 * its own style and colour, shown as the real picture of today, or the person's own), and what may show on them: these
 * are the app's own settings, sent with each picture it asks for (the bridge).
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import axiosInstance from '@/lib/utils/axios';
import { buddyApi } from '@/lib/api/buddyApi';
import { useLook, type LookMode, type LookTheme } from '@/components/phone/look';
import { Switch } from '@/components/phone/parts';
import { bridge, screenLook, setScreenLook, useShell, type ShellState } from '@/components/phone/shell';
import { useKept } from '@/components/phone/kept';

const LOOKS: Array<{ theme: LookTheme; name: string; meta: string; ground: string; card: string; ink: string; line: string; ring?: boolean }> = [
  { theme: 'paper', name: 'Paper', meta: 'Warm, like a notebook', ground: '#F5F0E6', card: '#ECE4D4', ink: '#23201B', line: '#CEC2AB' },
  { theme: 'slate', name: 'Slate', meta: 'Clean, like the web app', ground: '#FFFFFF', card: '#F4F3F2', ink: '#2C2C2B', line: '#DDDCD8', ring: true },
];
const MODES: Array<{ mode: LookMode; label: string }> = [
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
  { mode: 'system', label: 'System' },
];

/** The server's picture styles (GET /api/ambient/styles), the sky first. */
interface PictureStyle {
  id: string;
  name: string;
  blurb: string;
  colors: Array<{ id: string; name: string; swatch: string }>;
}

type Screen = 'lock' | 'home';

/** The real picture of today for one screen in the chosen style, small; the lock screen with the phone's clock over it. */
function ScreenPreview({ shell, screen, style, color }: { shell: ShellState; screen: Screen; style: string; color: string | null }) {
  const [now] = useState(() => new Date());
  const q = new URLSearchParams({ screen, w: '320', h: '694', theme: shell.pictureTheme, style, ...(color ? { color } : {}), ...(shell.hideTitles ? { titles: '0' } : {}), v: String(shell.okAt) });
  const src = `${String(axiosInstance.defaults.baseURL ?? '')}/api/ambient/wallpaper.png?${q.toString()}`;
  return (
    <div className="lock-shot is-real">
      {/* A picture the server draws for this phone (no next/image: it is private and changes with the day). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={src} src={src} alt="" />
      {screen === 'lock' && (
        <>
          <p className="clock">{new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: false }).format(now)}</p>
          <p className="date">{new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(now)}</p>
        </>
      )}
    </div>
  );
}

/**
 * Stage 11 (his decision 4): each screen on its own, Lock screen and Home screen: our design in its own style and colour,
 * or the person's own wallpaper left as it is. An older app (one look for both) still works: the choice applies to both.
 */
function ScreensGroup({ shell, name }: { shell: ShellState; name: string }) {
  const [screen, setScreen] = useKept<Screen>('look:screen', 'lock');
  const ours = screen === 'lock' ? shell.lock : shell.home;
  const look = screenLook(shell, screen);
  return (
    <div className="group">
      <h2>Your screens</h2>
      <div className="seg" role="tablist" aria-label="Which screen">
        {(['lock', 'home'] as const).map((s) => (
          <button key={s} type="button" role="tab" className={screen === s ? 'is-on' : ''} aria-selected={screen === s} onClick={() => setScreen(s)}>
            {s === 'lock' ? 'Lock screen' : 'Home screen'}
          </button>
        ))}
      </div>
      <div className="seg" role="group" aria-label={`The ${screen === 'lock' ? 'lock' : 'home'} screen's wallpaper`} style={{ marginTop: 10 }}>
        <button type="button" className={ours ? 'is-on' : ''} aria-pressed={ours} onClick={() => !ours && bridge()?.setSwitch(screen, true)}>
          Our design
        </button>
        <button type="button" className={!ours ? 'is-on' : ''} aria-pressed={!ours} onClick={() => ours && bridge()?.setSwitch(screen, false)}>
          Keep my own
        </button>
      </div>
      {ours ? (
        <LookPicker shell={shell} screen={screen} style={look.style} color={look.color} name={name} />
      ) : (
        <p className="meta" style={{ marginTop: 12 }}>
          {screen === 'lock'
            ? 'Your own lock screen wallpaper stays as it is. Recollect leaves it alone.'
            : 'Your own home screen wallpaper stays as it is. Recollect leaves it alone.'}
        </p>
      )}
    </div>
  );
}

function LookPicker({ shell, screen, style: chosenStyle, color: chosenColor, name }: { shell: ShellState; screen: Screen; style: string; color: string | null; name: string }) {
  const [styles, setStyles] = useKept<PictureStyle[] | null>('look:styles', null);
  useEffect(() => {
    let alive = true;
    axiosInstance.get('/api/ambient/styles').then(
      (r) => alive && setStyles((r.data?.data as PictureStyle[] | undefined) ?? []),
      () => alive && setStyles([]),
    );
    return () => {
      alive = false;
    };
  }, [setStyles]);
  const style = styles?.find((s) => s.id === chosenStyle) ?? styles?.[0] ?? null;
  const color = style?.colors.find((c) => c.id === chosenColor) ?? style?.colors[0] ?? null;
  return (
    <div className="lock-demo" style={{ marginTop: 14 }}>
      {style ? <ScreenPreview shell={shell} screen={screen} style={style.id} color={color?.id ?? null} /> : <div className="lock-shot" aria-hidden />}
      <div>
        <p className="row-title">{screen === 'lock' ? 'The dial of your day' : 'What matters today'}</p>
        <p className="meta" style={{ marginTop: 2 }}>
          {screen === 'lock' ? `One arc for each thing today, lit when done, with ${name}’s words under it.` : `Your reminders still to come, and a thought from ${name} when it has one.`}
        </p>
        {styles && styles.length ? (
          <div className="styles" role="group" aria-label="Its style">
            {styles.map((s) => (
              <button key={s.id} type="button" className={`chip${style?.id === s.id ? ' is-on' : ''}`} aria-pressed={style?.id === s.id} onClick={() => setScreenLook(screen, s.id, s.colors[0]?.id ?? null)}>
                {s.name}
              </button>
            ))}
          </div>
        ) : null}
        {style && style.colors.length > 1 ? (
          <div className="swatches" role="group" aria-label="Its colour">
            {style.colors.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`swatch-dot${color?.id === c.id ? ' is-on' : ''}`}
                style={{ ['--dot' as string]: c.swatch }}
                aria-label={c.name}
                aria-pressed={color?.id === c.id}
                onClick={() => setScreenLook(screen, style.id, c.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function LookScreen() {
  const { look, save } = useLook();
  const shell = useShell();
  const [name, setName] = useKept<string | null>('look:name', null);
  useEffect(() => {
    if (!shell) return;
    let alive = true;
    buddyApi.today().then((d) => alive && setName(d.name), () => undefined);
    return () => {
      alive = false;
    };
  }, [shell, setName]);
  const buddy = name?.trim() || 'your buddy';

  return (
    <>
      <header className="bar">
        <Link href="/m/settings" className="icon-btn" aria-label="Back">
          <ChevronLeft className="i" strokeWidth={1.75} aria-hidden />
        </Link>
        <p className="bar-title">Look</p>
      </header>
      <div className="scroll" style={{ paddingTop: 0 }}>
        <div className="group" style={{ marginTop: 8 }}>
          <h2>The app</h2>
          <div className="looks">
            {LOOKS.map((l) => (
              <button key={l.theme} type="button" className={`look${look.theme === l.theme ? ' is-on' : ''}`} aria-pressed={look.theme === l.theme} onClick={() => save({ ...look, theme: l.theme })}>
                <span className="mini" style={{ background: l.ground, ...(l.ring ? { boxShadow: 'inset 0 0 0 1px #E3E2DF' } : {}) }}>
                  <b style={{ background: l.card }} />
                  <i style={{ background: l.ink }} />
                  <i style={{ background: l.line }} />
                </span>
                <span className="name">
                  {l.name}
                  <Check className="i" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="meta">{l.meta}</p>
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Light or dark">
            {MODES.map((m) => (
              <button key={m.mode} type="button" className={look.mode === m.mode ? 'is-on' : ''} aria-pressed={look.mode === m.mode} onClick={() => save({ ...look, mode: m.mode })}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {shell ? (
          <>
            <ScreensGroup shell={shell} name={buddy} />
            <div className="group">
              <div className="set">
                <div className="row-main">
                  <p className="row-title">Hide personal details</p>
                  <p className="meta">Names and titles stay off both screens</p>
                </div>
                <Switch on={shell.hideTitles} label="Hide personal details" onChange={(next) => bridge()?.setSwitch('hideTitles', next)} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
