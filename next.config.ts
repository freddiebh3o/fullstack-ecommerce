// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos", // for seeded placeholder images
      },
      { protocol: "http", hostname: "s3.localhost.localstack.cloud" },
      { protocol: "http", hostname: "localhost" }, // if you ever build direct localhost URLs
      // you can add more hosts here later (e.g. S3, Cloudflare R2, etc.)
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;