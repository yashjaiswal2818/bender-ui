import path from "node:path";
import type { NextConfig } from "next";

// Pin the root so Next doesn't guess from lockfiles further up the disk.
const root = path.dirname(new URL(import.meta.url).pathname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
