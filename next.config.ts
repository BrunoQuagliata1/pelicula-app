import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["validity-sugar-musical-places.trycloudflare.com"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;
