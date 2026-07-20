import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  basePath: '/v2',
  assetPrefix: '',
};

export default nextConfig;
