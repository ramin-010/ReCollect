// ReCollect - Root Layout
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
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
  title: 'ReCollect - Professional Knowledge Management',
  description: 'Organize, connect, and recall your thoughts with ReCollect - Your professional knowledge companion',
  keywords: 'knowledge management, notes, productivity, organization, dashboard',
  authors: [{ name: 'ReCollect' }],
  openGraph: {
    title: 'ReCollect',
    description: 'Professional Knowledge Management System',
    type: 'website',
  },
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
          {children}
          <Toaster 
            position="bottom-right"
            richColors
            closeButton
            duration={4000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}