import { build } from "esbuild";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const resolve = (...segments) => path.resolve(root, ...segments);

try {
  await build({
    entryPoints: [resolve("scripts/obsidian-widget.tsx")],
    outfile: resolve("public/widgets/obsidian.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2019"],
    sourcemap: true,
    minify: true,
    jsx: "automatic",
    mainFields: ["module", "main"],
    alias: {
      "@": resolve("src"),
      "next/image": resolve("scripts/shims/next-image.tsx"),
      "next/font/google": resolve("scripts/shims/next-font-google.ts"),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    logLevel: "info",
  });
  console.log("Built obsidian web component bundle");
} catch (error) {
  console.error("Failed to build web component bundle", error);
  process.exit(1);
}
