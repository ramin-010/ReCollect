import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/brand';

// Only what is true of the app today (the honest-copy task, 11-15): no encryption, slides, email or
// company claims.
const TITLE = 'Kaaga: one memory for all your AIs';
const DESCRIPTION =
  'Kaaga keeps what you learn, build and plan, connects it to Claude, ChatGPT and your coding agents, and brings it back on a short daily list. Open source.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'spaced repetition',
    'learning app for engineers',
    'study plan',
    'note taking app',
    'second brain app',
    'MCP server',
    'Claude Code',
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: [{ url: '/brand/og-image-dark-1200x630.png', width: 1200, height: 630, alt: 'Kaaga: one memory for all your AIs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/brand/og-image-dark-1200x630.png'],
  },
  alternates: {
    canonical: '/welcome',
  },
};

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* JSON-LD Structured Data for the landing page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Kaaga',
            url: SITE_URL,
            description: DESCRIPTION,
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            featureList: [
              'Spaced revisions on a short daily list',
              'Docs with diagrams, code blocks and live editing',
              'Ask Kaaga inside a doc',
              'Goals with deadlines and honest forecasts',
              'Pinned notes and commands, one click to copy',
              'An MCP server for coding agents',
            ],
          }),
        }}
      />
      {children}
    </>
  );
}
