import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "*.app.github.dev"],
  experimental: {
    agentFeedback: true,
    serverActions: {
      allowedOrigins: ["*.app.github.dev", "localhost:3000", "127.0.0.1"],
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // Projektets rot = mappen där next.config.ts ligger
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;