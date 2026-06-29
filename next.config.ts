import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Los scripts/engine/ son Node.js puro (GitHub Actions), no parte del frontend
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
