// The phone world (PHONE_APP_REDESIGN_PLAN §7 step 2): the /m/… routes the phone app's WebView opens (a phone's browser
// can too). A world of its own: two looks, each light and dark (phone.css, ported from mockups/phone-app/), two type
// families self-hosted (Literata for the buddy's words, Figtree for theirs and the app's; SIL OFL 1.1, the licences
// beside them in ../_fonts), the bottom bar kept across screens. The web app's sidebar, top bar and theme stay out.
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { PhoneWorld } from '@/components/phone/PhoneWorld';
import { LOOK_SCRIPT } from '@/components/phone/lookScript';
import './phone.css';

const literata = localFont({
  src: [
    { path: '../_fonts/Literata-normal.woff2', style: 'normal', weight: '200 900' },
    { path: '../_fonts/Literata-italic.woff2', style: 'italic', weight: '200 900' },
  ],
  variable: '--pw-serif',
  display: 'swap',
});

const figtree = localFont({
  src: [{ path: '../_fonts/Figtree-normal.woff2', style: 'normal', weight: '300 900' }],
  variable: '--pw-sans',
  display: 'swap',
});

export const metadata: Metadata = { title: 'Kaaga', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#F5F0E6' };

export default function PhoneLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The device's look before the first paint: no frame in the wrong one. */}
      <script dangerouslySetInnerHTML={{ __html: LOOK_SCRIPT }} />
      <PhoneWorld fontClass={`${literata.variable} ${figtree.variable}`}>{children}</PhoneWorld>
    </>
  );
}
