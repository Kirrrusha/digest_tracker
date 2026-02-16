import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output для Docker
  output: "standalone",

  // В монорепе указываем корень workspace для корректного file tracing
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Игнорируем ошибки TypeScript при билде (для продакшена)
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
