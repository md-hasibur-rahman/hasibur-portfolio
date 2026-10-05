import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// Cloudinary media is loaded from res.cloudinary.com; Next's own chunk loading needs
// 'unsafe-inline' for script/style unless nonces are threaded through every request.
// 'unsafe-eval' is dev-only: React calls eval() to rebuild component stacks and Turbopack needs it
// for HMR. React never uses eval() in production, so the production policy stays eval-free.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://res.cloudinary.com",
  "media-src 'self' https://res.cloudinary.com",
  "font-src 'self'",
  // The browser posts files straight to Cloudinary's signed-upload endpoint; nothing else is reachable.
  "connect-src 'self' https://api.cloudinary.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Lets the dashboard guard call forbidden() so a non-admin really gets an HTTP 403 response.
    authInterrupts: true,
  },
  images: {
    // Uploaded media lives on Cloudinary's CDN; only that host is allowed through next/image.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isProduction
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
