import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    esmExternals: true,
  },
  transpilePackages: ["@mui/material", "@emotion/react", "@emotion/styled"],

  async rewrites() {
    return [
      {
        source: "/api/rooms/:path*/stream",
        destination:
          "http://ec2-54-87-136-240.compute-1.amazonaws.com:3000/api/rooms/:path*/stream",
      },
    ];
  },
};

export default nextConfig;
