import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Re-enable strict checks now that the codebase has been cleaned up.
  // Hiding TS errors and disabling React strict mode previously masked
  // real bugs (notably in the auth flow).
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
};

export default nextConfig;
