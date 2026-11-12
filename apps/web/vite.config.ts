import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";
import { resolveReleaseMetadata } from "./src/build/release-metadata.ts";

const git = (args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const releaseMetadata = resolveReleaseMetadata(process.env, git);

export default defineConfig({
  define: { __FRAGMENTS_BUILD__: JSON.stringify(releaseMetadata) },
  server: {
    host: "127.0.0.1",
    proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: true } },
  },
  preview: { host: "127.0.0.1" },
});
