import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

const here = path.dirname(fileURLToPath(import.meta.url));
// Единый .env в корне монорепозитория.
loadEnv({ path: path.resolve(here, "../../.env"), quiet: true });

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: path.resolve(here, "../.."),
  transpilePackages: ["@leadflow/shared"],
  serverExternalPackages: ["playwright-core", "bullmq", "ioredis", "exceljs", "pg"],
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [
      // Превью КП встраивается в iframe того же origin — для него X-Frame-Options задаёт сам обработчик.
      { source: "/((?!api/proposals/[^/]+/html).*)", headers: securityHeaders },
      { source: "/api/proposals/:id/html", headers: securityHeaders.filter((h) => h.key !== "X-Frame-Options") },
    ];
  },
};

export default nextConfig;
