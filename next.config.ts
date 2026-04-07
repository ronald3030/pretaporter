import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      // Instagram / Facebook CDN — used by Instagram Graph API media URLs
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      // Supabase Storage (both URL formats from the SDK)
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

export default nextConfig;
