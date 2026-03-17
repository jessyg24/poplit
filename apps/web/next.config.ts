import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@poplit/core", "@poplit/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
