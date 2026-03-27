import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      {
        source: "/forgot-password",
        destination: "/auth/forgot-password",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
