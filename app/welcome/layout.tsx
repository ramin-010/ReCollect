import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ReCollect — Organize Your Thoughts, Amplify Your Knowledge',
  description:
    'ReCollect is the all-in-one knowledge workspace for professionals. Capture notes, manage tasks, create presentations, draft emails, and sketch on infinite whiteboards — all powered by AI. Free during beta.',
  keywords: [
    'knowledge management app',
    'note taking app',
    'productivity tool',
    'second brain app',
    'task manager',
    'AI notes',
    'whiteboard app',
    'presentation tool',
    'personal wiki',
    'knowledge workspace',
    'Notion alternative',
    'all-in-one workspace',
  ],
  openGraph: {
    title: 'ReCollect — Organize Your Thoughts, Amplify Your Knowledge',
    description:
      'The all-in-one knowledge workspace: notes, tasks, whiteboards, slides, and AI-powered email — free during beta.',
    type: 'website',
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
    card: 'summary_large_image',
    title: 'ReCollect — Organize Your Thoughts, Amplify Your Knowledge',
    description:
      'The all-in-one knowledge workspace: notes, tasks, whiteboards, slides, and AI-powered email — free during beta.',
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
            name: 'ReCollect',
            url: 'https://re-collect.in',
            description:
              'All-in-one knowledge workspace for professionals — notes, tasks, whiteboards, slides, and AI-powered email.',
            applicationCategory: 'ProductivityApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: 'Free during beta',
            },
            featureList: [
              'AI-Powered Notes & Docs',
              'Infinite Whiteboard Canvas',
              'Integrated Task Management',
              'Spatial Presentations & Slides',
              'AI Email Summaries & Drafts',
              'Real-time Collaboration',
              'Local-First Architecture',
              'End-to-End Encryption',
            ],
            creator: {
              '@type': 'Organization',
              name: 'ReCollect Inc.',
            },
          }),
        }}
      />
      {children}
    </>
  );
}
