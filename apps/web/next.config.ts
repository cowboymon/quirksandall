import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@quirksandall/shared"],
  images: {
    remotePatterns: [{ hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
