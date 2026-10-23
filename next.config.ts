import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  basePath: '',
  assetPrefix: '',
  allowedDevOrigins: ['wxcl.nzyy.ltd', 'nzyy.ltd'],
};

export default nextConfig;
