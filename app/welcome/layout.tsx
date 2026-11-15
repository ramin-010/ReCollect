import type { Metadata } from 'next';

// Only what is true of the app today (the honest-copy task, 11-15): no encryption, slides, email or
// company claims.
const TITLE = 'Recollect: keep what you learn, find what you need';
const DESCRIPTION =
  'Recollect brings your notes back on a short daily list, keeps your goals honest and works with the coding agents you already use. Open source.';

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
    images: [
      {
        url: '/logo3.webp',
        width: 512,
        height: 512,
        alt: 'Recollect logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/logo3.webp'],
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
            name: 'Recollect',
            url: 'https://re-collect.in',
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
              'Ask AI inside a doc',
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
