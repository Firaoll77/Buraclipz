import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    TZ: "Africa/Addis_Ababa",
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    if (process.env.BACKEND_URL) {
      return [
        {
          source: "/api/:path*",
          destination: `${process.env.BACKEND_URL}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;

