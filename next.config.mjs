import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for a small production Docker image
  // (SETUP_HOMELAB.md). Traces deps into .next/standalone.
  output: "standalone",
  // Pin the workspace root — a stray ~/package-lock.json otherwise makes Next
  // infer the home directory as the root and mis-resolve modules.
  outputFileTracingRoot: __dirname,
  // sharp is a native module used only in server routes (image ingest, §4a) —
  // keep it external so it isn't bundled.
  serverExternalPackages: ["sharp"],
  // Storage-served photos will be signed URLs from Supabase; images are rendered
  // as real <img src> per BUILD_SPEC §8, so no remotePatterns needed yet.
};

export default nextConfig;
