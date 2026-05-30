import type { NextConfig } from "next";

const backendInternalUrl =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, "") ||
  "http://localhost:8083";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.110", "localhost"],
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
  },
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
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendInternalUrl}/api/v1/:path*`,
      },
      {
        source: "/actuator/:path*",
        destination: `${backendInternalUrl}/actuator/:path*`,
      },
    ];
  },
};

export default nextConfig;
