import type { NextConfig } from "next";

// ── Security headers ────────────────────────────────────────────────
// Vercel aplica estos a todas las respuestas de la app.
// CSP permite: Supabase (DB/Storage), Instagram/Facebook CDN (fotos),
// Google Analytics si se añade en el futuro.
const securityHeaders = [
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-XSS-Protection",          value: "1; mode=block" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://vercel.live https://maps.googleapis.com https://maps.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com https://maps.gstatic.com",
      "font-src 'self' data: https://fonts.gstatic.com https://maps.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.cdninstagram.com https://*.fbcdn.net https://www.google-analytics.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://graph.instagram.com https://graph.facebook.com https://open.er-api.com https://vercel.live wss://ws-us3.pusher.com https://maps.googleapis.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
