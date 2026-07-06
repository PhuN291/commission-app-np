/**
 * Gộp handler serverless (server/vercel-entry.ts) thành 1 file tự-chứa api/_bundle.js.
 * esbuild resolve alias @shared/* + gộp toàn bộ code server; node_modules để external
 * (Vercel cài sẵn, @vercel/nft trace kèm). Chạy trong `npm run vercel-build`.
 */
import { build as esbuild } from "esbuild";

async function main() {
  await esbuild({
    entryPoints: ["server/vercel-entry.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "api/_bundle.js",
    target: "node20",
    packages: "external",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    // Một số dep CJS có thể dùng require lúc chạy — cấp require trong scope ESM.
    banner: {
      js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
    },
    logLevel: "info",
  });
  console.log("✓ api/_bundle.js built");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
