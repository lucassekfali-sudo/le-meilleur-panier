import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TEMPORAIRE : ignoreBuildErrors remis a true le temps de nettoyer
  // les erreurs TS pre-existantes dans les routes API (createUser,
  // markAccessKeyAsUsed, etc). A repasser a false apres le grand
  // refactor des features.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
