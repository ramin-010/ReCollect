// ReCollect - Root Layout
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from '@/components/ui/sonner';

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
    default: 'ReCollect',
    template: '%s | ReCollect',
  },
  description:
    'Organize, connect, and recall your thoughts with ReCollect — your professional knowledge companion for notes, ideas, and productivity.',
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
  authors: [{ name: 'ReCollect' }],
  creator: 'ReCollect',
  publisher: 'ReCollect',
  icons: {
    icon: [
      { url: '/logo3.webp', type: 'image/webp' },
    ],
    apple: [
      { url: '/logo3.webp', type: 'image/webp' },
    ],
    shortcut: '/logo3.webp',
  },
  openGraph: {
    title: 'ReCollect',
    description:
      'Organize, connect, and recall your thoughts with ReCollect — your professional knowledge companion.',
    siteName: 'ReCollect',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/logo3.webp',
        width: 512,
        height: 512,
        alt: 'ReCollect Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'ReCollect',
    description:
      'Organize, connect, and recall your thoughts with ReCollect — your professional knowledge companion.',
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
  applicationName: 'ReCollect',
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