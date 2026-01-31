import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output для Docker
  output: "standalone",

  // Игнорируем ошибки TypeScript при билде (для продакшена)
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
