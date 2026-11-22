import localFont from 'next/font/local';

/**
 * The buddy's voice on the web: Literata (self-hosted, SIL OFL 1.1; the phone world's rule, PHONE_APP_REDESIGN_PLAN:
 * the serif is always the buddy speaking, everything else is the app). Put `voice.className` on the words themselves.
 */
export const voice = localFont({
  src: [
    { path: '../../app/(phone)/_fonts/Literata-normal.woff2', style: 'normal', weight: '200 900' },
    { path: '../../app/(phone)/_fonts/Literata-italic.woff2', style: 'italic', weight: '200 900' },
  ],
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});
