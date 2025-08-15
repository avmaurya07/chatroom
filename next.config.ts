import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    esmExternals: true,
  },
  transpilePackages: ["@mui/material", "@emotion/react", "@emotion/styled"],
};

export default nextConfig;
