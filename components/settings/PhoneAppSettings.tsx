'use client';

import './phone-app.css';
import { useEffect, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Copy, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { RcButton } from '@/components/rc-ui';
import axiosInstance from '@/lib/utils/axios';
import { agentApi } from '@/lib/api/agentApi';

/** An address the phone can reach this server at: the public one, the home network's, or USB (adb reverse). */
interface ServerAddress {
  url: string;
  kind: 'public' | 'network' | 'usb';
}

const KIND_WORDS: Record<ServerAddress['kind'], string> = {
  public: 'Anywhere (the public address)',
  network: 'On the same Wi-Fi or hotspot as this computer',
  usb: 'Over the USB cable (adb reverse)',
};

/**
 * Settings → Phone app (ANDROID_APP_SPEC): connects our Android app to this server with a token that
 * can only read the day's picture and widget (the `ambient` scope). The phone's own camera reads the
 * QR code: a link to the server's /phone/connect page, which opens the app (or offers its file).
 * The token shows once, here.
 */
export function PhoneAppSettings() {
  const [addresses, setAddresses] = useState<ServerAddress[] | null>(null);
  const [chosen, setChosen] = useState<string>('');
  const [link, setLink] = useState<string | null>(null);
  const [making, setMaking] = useState(false);

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/ambient/addresses')
      .then((r) => {
        if (!alive) return;
        const list = (r.data?.data ?? []) as ServerAddress[];
        setAddresses(list);
        setChosen(list[0]?.url ?? '');
      })
      .catch(() => alive && setAddresses([]));
    return () => {
      alive = false;
    };
  }, []);

  const make = async () => {
    if (!chosen) return;
    setMaking(true);
    try {
      const made = await agentApi.createToken({ name: 'Phone app', scopes: ['ambient'] });
      // A web link, so any camera or QR reader opens it; the page hands the token to the app with one
      // tap and offers the app's file when it isn't installed. The token rides in the fragment, which
      // never reaches the server.
      setLink(`${chosen}/phone/connect#t=${encodeURIComponent(made.token)}`);
    } catch {
      toast.error("The connect code couldn't be made. Try again.");
    } finally {
      setMaking(false);
    }
  };

  const svg = (() => {
    if (!link) return null;
    const qr = qrcode(0, 'M');
    qr.addData(link);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  })();

  return (
    <div className="phone-app-settings">
      <p className="phone-app-intro">Our Android app sets the picture of your day as the wallpaper and shows it in a widget. It can read that picture and its lines, nothing else.</p>
      {addresses === null ? (
        <p className="rc-meta mt-4">Finding this computer&apos;s addresses…</p>
      ) : addresses.length === 0 ? (
        <p className="rc-meta mt-4">This server&apos;s address couldn&apos;t be read. Check that it is running.</p>
      ) : (
        <>
          <p className="rc-field-label mt-4">Where the phone finds Recollect</p>
          <div className="phone-app-addresses" role="radiogroup" aria-label="Server address">
            {addresses.map((a) => (
              <label key={a.url} className="phone-app-address">
                <input type="radio" name="phone-server" value={a.url} checked={chosen === a.url} onChange={() => setChosen(a.url)} />
                <span>
                  <span className="phone-app-url">{a.url}</span>
                  <span className="phone-app-kind">{KIND_WORDS[a.kind]}</span>
                </span>
              </label>
            ))}
          </div>
          {!link ? (
            <RcButton variant="main" className="mt-4" icon={<Smartphone aria-hidden />} busy={making} onClick={() => void make()}>
              Make the connect code
            </RcButton>
          ) : (
            <div className="phone-app-code">
              {/* qrcode-generator draws plain SVG from the link (no scripts). */}
              <div className="phone-app-qr" role="img" aria-label="Connect code" dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
              <div className="phone-app-steps">
                <p>Point your phone&apos;s camera at the code and open the link it shows, then tap Open the phone app. No app on the phone yet? The same page offers it.</p>
                <p className="rc-meta">The code holds a new token that can only read the day&apos;s picture. It shows once; end it any time in Settings → Agents (&ldquo;Phone app&rdquo;).</p>
                <RcButton
                  variant="quiet"
                  size="sm"
                  className="phone-app-copy"
                  icon={<Copy aria-hidden />}
                  onClick={() => {
                    void navigator.clipboard.writeText(link).then(
                      () => toast.success('Copied'),
                      () => toast.error("Couldn't copy."),
                    );
                  }}
                >
                  Copy the link
                </RcButton>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
