import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms for using Recollect, a personal app run by one person for the people they invite.',
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
