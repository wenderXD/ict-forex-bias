import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",          // static export — works with any hosting
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
