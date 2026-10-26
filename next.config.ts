import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["yahoo-finance2"],
  experimental: {
    // Visited pages stay warm for a few minutes, so switching back does not wait on the server.
    staleTimes: { dynamic: 300 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/time-machine",
        destination: "/heatmap",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
