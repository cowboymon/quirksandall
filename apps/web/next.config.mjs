/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@quirksandall/shared"],
  images: {
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      { hostname: "bktxnovrkiilkfvzlwwo.supabase.co" },
    ],
  },
};

export default nextConfig;
