import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for the VPS container.
  output: "standalone",
};

export default nextConfig;
