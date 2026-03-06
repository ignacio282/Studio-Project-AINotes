import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Keep dev and production outputs isolated to avoid manifest/file collisions
  // when `next dev` is running and `next build` is executed in the same repo.
  distDir: isDev ? ".next-dev" : ".next",
  turbopack: {
    // Force Turbopack to use this app folder as workspace root.
    // This avoids root auto-detection issues when a parent lockfile exists.
    root: process.cwd(),
  },
  eslint: {
    // Allow production builds to succeed even if there are
    // ESLint warnings/errors. This is helpful for rapid demos.
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/home",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
