/**
 * Build hitman-core.js and publish sandbox-shell → public/play/ for Next static serving.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "sandbox-shell");
const OUT = path.join(ROOT, "public", "play");

function copyDir(src: string, dest: string, skip = new Set<string>()) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (skip.has(name)) continue;
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}

function patchIndexHtml() {
  const indexPath = path.join(OUT, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  html = html.replaceAll("/sandbox-shell/", "/play/");
  const buildMatch =
    html.match(/id="build-tag-top"[^>]*>([^<]+)</)?.[1]?.trim() ??
    html.match(/play-camera-v\d+|adr14-v\d+|shell-fix-v\d+|layout-npc-v\d+|anchor-fix-v\d+/)?.[0];
  const buildTag = buildMatch ?? `play-${Date.now()}`;
  html = html.replace(/hitman-core\.js(\?v=[^"]+)?/, `hitman-core.js?v=${buildTag}`);
  for (const file of ["shell.js", "map-pick.js", "render.js", "player-plan.js", "world-lerp.js"]) {
    html = html.replace(
      new RegExp(`/play/js/${file}(\\?v=[^"]+)?`, "g"),
      `/play/js/${file}?v=${buildTag}`,
    );
  }
  fs.writeFileSync(indexPath, html);
}

async function main() {
  const { execSync } = await import("node:child_process");
  execSync("npm run build:sandbox", { cwd: ROOT, stdio: "inherit" });

  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
  copyDir(SRC, OUT, new Set(["README.md"]));
  patchIndexHtml();

  console.log("Published sandbox → public/play/");
  console.log("Open: http://localhost:8747/play/index.html");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
