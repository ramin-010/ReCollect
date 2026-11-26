import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Kaaga keeps about you, what its AI reads, who can see what, and how to download or delete it all.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
