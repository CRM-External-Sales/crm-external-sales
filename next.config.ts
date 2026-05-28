import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Evitar que Next infiera otro proyecto como raíz (p. ej. package-lock.json en %USERPROFILE%),
  // lo que puede dejar servidor/API desalineadas con este repo tras el build.
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/forgot-password",
        destination: "/auth/forgot-password",
        permanent: true,
      },
      {
        source: "/update-password",
        destination: "/auth/reset-password",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
