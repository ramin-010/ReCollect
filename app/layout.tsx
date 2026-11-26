// Kaaga: the root layout
import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
// Theme v2 (Notion-grade tokens + the OS font). Unlayered, so it wins over the legacy blocks in globals.css.
import './theme-v2.css';
// Paper, the phone app's look, beside Slate (data-look="paper" on <html>, set before the first paint).
import './theme-paper.css';
import { WEB_LOOK_SCRIPT } from '@/lib/webLookScript';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerRegister } from '@/components/providers/ServiceWorkerRegister';
import { SITE_URL } from '@/lib/brand';

// Using Outfit for a modern, clean look
const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const DESCRIPTION = 'One memory for all your AIs: Kaaga keeps what you learn, build and plan, and brings it back at the right moment.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Kaaga',
    template: '%s | Kaaga',
  },
  description: DESCRIPTION,
  keywords: ['memory for AI', 'MCP', 'learning', 'spaced repetition', 'notes', 'study planner', 'second brain', 'Claude', 'ChatGPT'],
  authors: [{ name: 'Kaaga' }],
  creator: 'Kaaga',
  publisher: 'Kaaga',
  // The logo set (KAAGA_REBRAND_PLAN): the .ico for old browsers, the SVG that follows the browser's light or dark.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'Kaaga',
    description: 'One memory for all your AIs.',
    siteName: 'Kaaga',
    url: SITE_URL,
    type: 'website',
    locale: 'en_IN',
    images: [{ url: '/brand/og-image-dark-1200x630.png', width: 1200, height: 630, alt: 'Kaaga: one memory for all your AIs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kaaga',
    description: 'One memory for all your AIs.',
    images: ['/brand/og-image-dark-1200x630.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  applicationName: 'Kaaga',
  category: 'productivity',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#191919' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning >
        <body className={`${outfit.variable} ${inter.variable} font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: WEB_LOOK_SCRIPT }} />

        <ThemeProvider>
          <AuthProvider>
            {children}
            <ServiceWorkerRegister />
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              duration={4000}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}