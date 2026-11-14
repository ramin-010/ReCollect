// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  // Dev only: keep Next's "N" badge off the sidebar footer (Settings, theme), which sits bottom-left.
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;