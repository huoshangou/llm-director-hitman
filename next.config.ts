import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/play", destination: "/play/index.html" }];
  },
};

export default nextConfig;
