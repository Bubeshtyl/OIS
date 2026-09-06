import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "date-fns-tz"],
  },
};

export default nextConfig;
