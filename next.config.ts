import type { NextConfig } from "next";

// Fonts are self-hosted via next/font (no runtime Google Fonts requests); Cloudinary is
// only ever called server-side for uploads, so no third-party script/connect origins are needed.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// React's dev-mode debugging (stack-trace reconstruction) relies on eval(), which a strict
// script-src blocks — apply the CSP only in production, where React never uses eval().
if (process.env.NODE_ENV === "production") {
  securityHeaders.push({ key: "Content-Security-Policy", value: csp });
}

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
