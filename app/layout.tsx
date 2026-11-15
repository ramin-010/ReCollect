// Recollect - Root Layout
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
// Theme v2 (Notion-grade tokens + the OS font). Unlayered, so it wins over the legacy blocks in globals.css.
import './theme-v2.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerRegister } from '@/components/providers/ServiceWorkerRegister';

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

export const metadata: Metadata = {
  metadataBase: new URL('https://re-collect.in'),
  title: {
    default: 'Recollect',
    template: '%s | Recollect',
  },
  description:
    'Organize, connect, and recall your thoughts with Recollect — your professional knowledge companion for notes, ideas, and productivity.',
  keywords: [
    'knowledge management',
    'notes',
    'productivity',
    'organization',
    'second brain',
    'note taking',
    'personal wiki',
    'knowledge base',
    'dashboard',
  ],
  authors: [{ name: 'Recollect' }],
  creator: 'Recollect',
  publisher: 'Recollect',
  icons: {
    icon: [
      { url: '/logo3.webp', type: 'image/webp' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
    ],
    shortcut: '/logo3.webp',
  },
  openGraph: {
    title: 'Recollect',
    description:
      'Organize, connect, and recall your thoughts with Recollect — your professional knowledge companion.',
    siteName: 'Recollect',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/logo3.webp',
        width: 512,
        height: 512,
        alt: 'Recollect Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Recollect',
    description:
      'Organize, connect, and recall your thoughts with Recollect — your professional knowledge companion.',
    images: ['/logo3.webp'],
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
  applicationName: 'Recollect',
  category: 'productivity',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning >
        <body className={`${outfit.variable} ${inter.variable} font-sans antialiased`}>

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