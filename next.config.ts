import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  // Allow accessing the dev server over the LAN IP (e.g. from another device)
  // without Next.js blocking /_next/ dev resources as cross-origin.
  allowedDevOrigins: ["192.168.0.150"],
};

export default nextConfig;
