import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to succeed even if there are
    // ESLint warnings/errors. This is helpful for rapid demos.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
