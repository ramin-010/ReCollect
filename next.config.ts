// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  // Dev only: keep Next's "N" badge off the sidebar footer (Settings, theme), which sits bottom-left.
  devIndicators: { position: 'bottom-right' },
  // Dev only: a second dev server beside the first (the connector simulation's sign-in pages, talking to a test
  // backend) builds into its own folder, since Next locks the folder a dev server uses. Unset: '.next', as before.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;