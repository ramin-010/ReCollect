import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read the ReCollect terms of service. Understand your rights and responsibilities when using the ReCollect knowledge management platform.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
