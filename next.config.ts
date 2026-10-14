import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The migrations are read at runtime (see lib/engine/migrations.ts), so they must ship with the server bundle.
  outputFileTracingIncludes: {
    "/**": ["./prisma/migrations/**/*"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
