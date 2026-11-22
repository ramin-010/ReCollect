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
type Layout = 'classic' | 'glass' | 'stack';

/**
 * Each screen's layout (the owner, 11-22: both new lock designs kept, his choice here; options for the home screen too).
 * An app without the choice (before 0.7.3's layouts) shows no layout row.
 */
const LAYOUTS: Array<{ id: Layout; label: string }> = [
  { id: 'classic', label: 'Classic' },
  { id: 'glass', label: 'Glass' },
  { id: 'stack', label: 'Stack' },
];
const appliedLayout = (shell: ShellState, screen: Screen): Layout => (screen === 'lock' ? shell.lockLayout ?? 'classic' : shell.homeLayout ?? 'classic');

/** The preview's address for one screen in a style and layout (the server draws it small for this phone). */
function previewSrc(shell: ShellState, screen: Screen, style: string, color: string | null, layout: Layout): string {
  const q = new URLSearchParams({ screen, w: '320', h: '694', theme: shell.pictureTheme, style, ...(color ? { color } : {}), ...(shell.hideTitles ? { titles: '0' } : {}), ...(layout !== 'classic' ? { layout } : {}), format: 'webp', v: String(shell.okAt) });
  return `${String(axiosInstance.defaults.baseURL ?? '')}/api/ambient/wallpaper.png?${q.toString()}`;
}

/**
 * The real picture of today for one screen in the chosen style, small; the lock screen with the phone's clock over it.
 * 0.7.3 (the owner: the pictures took long to show): the last picture stays while the next one loads, then swaps in.
 */
function ScreenPreview({ shell, screen, style, color, layout }: { shell: ShellState; screen: Screen; style: string; color: string | null; layout: Layout }) {
  const [now] = useState(() => new Date());
  const want = previewSrc(shell, screen, style, color, layout);
  const [shown, setShown] = useState(want);
  const loading = want !== shown;
  useEffect(() => {
    if (want === shown) return;
    let alive = true;
    const img = new Image();
    img.onload = img.onerror = () => alive && setShown(want);
    img.src = want;
    return () => {
      alive = false;
    };
  }, [want, shown]);
  return (
    <div className="lock-shot is-real" aria-busy={loading || undefined}>
      {/* A picture the server draws for this phone (no next/image: it is private and changes with the day). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shown} alt="" style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 160ms ease' }} />
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

function LookPicker({ shell, screen, style: appliedStyle, color: appliedColor, name }: { shell: ShellState; screen: Screen; style: string; color: string | null; name: string }) {
  const [styles, setStyles] = useKept<PictureStyle[] | null>('look:styles', null);
  // 0.7.3 (the owner): a style or colour is tried in the preview first; Apply sets it on the phone (each tap used to).
  const [draft, setDraft] = useState<{ screen: Screen; style: string; color: string | null; layout?: Layout } | null>(null);
  const layouts = !!bridge()?.setScreenDesign;
  // Set on Apply; "Applying…" shows while the app's refresh that sets it runs (the look itself is kept at once).
  const [applied, setApplied] = useState(false);
  const applying = applied && shell.busy;
  const chosenStyle = draft && draft.screen === screen ? draft.style : appliedStyle;
  const chosenColor = draft && draft.screen === screen ? draft.color : appliedColor;
  const nowLayout = appliedLayout(shell, screen);
  const layout: Layout = draft && draft.screen === screen && draft.layout ? draft.layout : nowLayout;
  const choose = (next: { screen: Screen; style: string; color: string | null; layout?: Layout }) => {
    setApplied(false);
    setDraft(next);
  };
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
  const pending = !!style && (style.id !== appliedStyle || (color?.id ?? null) !== (appliedColor ?? style.colors[0]?.id ?? null) || layout !== nowLayout);
  const apply = () => {
    if (!style) return;
    setApplied(true);
    const b = bridge();
    if (b?.setScreenDesign) b.setScreenDesign(screen, layout, style.id, color?.id ?? null);
    else setScreenLook(screen, style.id, color?.id ?? null);
  };
  return (
    <div className="lock-demo" style={{ marginTop: 14 }}>
      {style ? <ScreenPreview shell={shell} screen={screen} style={style.id} color={color?.id ?? null} layout={layout} /> : <div className="lock-shot" aria-hidden />}
      <div>
        <p className="row-title">{screen === 'lock' ? 'The dial of your day' : 'What matters today'}</p>
        <p className="meta" style={{ marginTop: 2 }}>
          {screen === 'lock' ? `One arc for each thing today, lit when done, with ${name}’s words and what’s next under it.` : `What you left unfinished, what’s coming up, and a thought from ${name} when it has one.`}
        </p>
        {layouts ? (
          <div className="seg" role="group" aria-label="Its layout" style={{ marginTop: 12 }}>
            {LAYOUTS.map((l) => (
              <button key={l.id} type="button" className={layout === l.id ? 'is-on' : ''} aria-pressed={layout === l.id} onClick={() => choose({ screen, style: style?.id ?? chosenStyle, color: color?.id ?? null, layout: l.id })}>
                {l.label}
              </button>
            ))}
          </div>
        ) : null}
        {styles && styles.length ? (
          <div className="styles" role="group" aria-label="Its style">
            {styles.map((s) => (
              <button key={s.id} type="button" className={`chip${style?.id === s.id ? ' is-on' : ''}`} aria-pressed={style?.id === s.id} onClick={() => choose({ screen, style: s.id, color: s.colors[0]?.id ?? null, layout })}>
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
                onClick={() => choose({ screen, style: style.id, color: c.id, layout })}
              />
            ))}
          </div>
        ) : null}
        {pending || applying ? (
          <button type="button" className="btn main" style={{ marginTop: 14, height: 38, padding: '0 16px', opacity: applying ? 0.6 : 1 }} disabled={applying} onClick={apply}>
            {applying ? 'Applying…' : `Apply to the ${screen === 'lock' ? 'lock' : 'home'} screen`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const PICTURE_THEMES: Array<{ id: 'light' | 'dark' | 'system'; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Match the phone' },
];

/**
 * Notification icons on the lock screen (the live lock screen, app 0.4.0; on this page since 0.7.3): the app draws the
 * lock picture itself with your notifications' icons under the words. Android asks two things, one at a time.
 */
function LiveLock({ shell }: { shell: ShellState }) {
  const needAccess = shell.live && shell.liveAllowed === false;
  const needSet = shell.live && shell.liveAllowed !== false && shell.liveActive === false;
  return (
    <>
      <div className="set">
        <div className="row-main">
          <p className="row-title">Notification icons on the lock screen</p>
          <p className="meta">
            {!shell.live
              ? 'Your notifications’ icons, round and in colour, under the words'
              : needAccess
                ? 'Step 1 of 2: let the app see your notifications’ icons'
                : needSet
                  ? 'Step 2 of 2: set the app’s live wallpaper'
                  : 'On'}
          </p>
        </div>
        <Switch on={shell.live} label="Notification icons on the lock screen" onChange={(next) => bridge()?.setSwitch('live', next)} />
      </div>
      {needAccess ? (
        <button type="button" className="btn out" style={{ height: 38, padding: '0 14px', marginTop: 4 }} onClick={() => bridge()?.openPermission?.('notificationAccess')}>
          Allow notification access
        </button>
      ) : needSet ? (
        <button type="button" className="btn out" style={{ height: 38, padding: '0 14px', marginTop: 4 }} onClick={() => bridge()?.openLivePicker?.()}>
          Set the live wallpaper
        </button>
      ) : null}
    </>
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
              {bridge()?.setPictureTheme ? (
                <div className="set" style={{ display: 'block' }}>
                  <p className="row-title">Wallpaper colours</p>
                  <div className="seg" style={{ marginTop: 8 }} role="group" aria-label="Wallpaper colours">
                    {PICTURE_THEMES.map((t) => (
                      <button key={t.id} type="button" className={(shell.theme ?? 'system') === t.id ? 'is-on' : ''} aria-pressed={(shell.theme ?? 'system') === t.id} onClick={() => bridge()?.setPictureTheme?.(t.id)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="set">
                <div className="row-main">
                  <p className="row-title">Hide personal details</p>
                  <p className="meta">Names and titles stay off both screens</p>
                </div>
                <Switch on={shell.hideTitles} label="Hide personal details" onChange={(next) => bridge()?.setSwitch('hideTitles', next)} />
              </div>
              {shell.lock && bridge()?.openLivePicker ? <LiveLock shell={shell} /> : null}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
