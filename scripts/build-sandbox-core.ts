import * as esbuild from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";

const outDir = path.join(process.cwd(), "sandbox-shell", "dist");
const outfile = path.join(outDir, "hitman-core.js");

fs.mkdirSync(outDir, { recursive: true });

async function main() {
  await esbuild.build({
    entryPoints: [path.join(process.cwd(), "lib", "bridge", "sandboxApi.ts")],
    bundle: true,
    format: "iife",
    globalName: "HitmanCore",
    outfile,
    platform: "browser",
    target: "es2020",
    logLevel: "info",
  });
  console.log(`Wrote ${outfile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
