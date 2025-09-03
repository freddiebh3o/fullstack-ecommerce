import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos", // for seeded placeholder images
      },
      // you can add more hosts here later (e.g. S3, Cloudflare R2, etc.)
    ],
  },
};

export default nextConfig;