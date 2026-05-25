import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    inlineCss: true,
  },
  images: {
    qualities: [70, 75],
  },
  turbopack: {
    resolveAlias: {
      "next/dist/build/polyfills/polyfill-module":
        "./src/lib/modernNextPolyfills.ts",
      "../build/polyfills/polyfill-module": "./src/lib/modernNextPolyfills.ts",
    },
  },

  async rewrites() {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8083";

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBaseUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
