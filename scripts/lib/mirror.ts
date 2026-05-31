import * as fs from "node:fs";
import * as path from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  ".turbo",
]);

const SKIP_FILES = new Set([".DS_Store"]);

/** Skip build output dirs only at repo root (keep public/play/dist for Play bundle). */
export function shouldSkipEntry(name: string, isDir: boolean, relDir = ""): boolean {
  if (SKIP_FILES.has(name)) return true;
  if (!isDir || !SKIP_DIRS.has(name)) return false;
  return relDir === "";
}

export function copyTree(
  src: string,
  dest: string,
  onCopy?: (rel: string) => void,
  relDir = "",
) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const st = fs.statSync(s);
    if (shouldSkipEntry(name, st.isDirectory(), relDir)) continue;
    const d = path.join(dest, name);
    if (st.isDirectory()) {
      copyTree(s, d, onCopy, relDir ? path.join(relDir, name) : name);
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
      onCopy?.(path.relative(src, s));
    }
  }
}

/** 仅当 src 比 dest 新或 dest 缺失时复制单个文件 */
export function copyIfNewer(srcFile: string, destFile: string): boolean {
  if (!fs.existsSync(srcFile)) return false;
  const srcStat = fs.statSync(srcFile);
  if (!fs.existsSync(destFile)) {
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.copyFileSync(srcFile, destFile);
    return true;
  }
  const destStat = fs.statSync(destFile);
  if (srcStat.mtimeMs <= destStat.mtimeMs) return false;
  fs.copyFileSync(srcFile, destFile);
  return true;
}

export function mirrorRepo(src: string, dest: string, quiet = false): number {
  let n = 0;
  const walk = (relDir: string) => {
    const dir = path.join(src, relDir);
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const rel = path.join(relDir, name);
      const s = path.join(src, rel);
      const st = fs.statSync(s);
      if (shouldSkipEntry(name, st.isDirectory(), relDir)) continue;
      const d = path.join(dest, rel);
      if (st.isDirectory()) {
        fs.mkdirSync(d, { recursive: true });
        walk(rel);
      } else {
        if (copyIfNewer(s, d)) {
          n += 1;
          if (!quiet) process.stdout.write(`  ↑ ${rel}\n`);
        }
      }
    }
  };
  walk("");
  return n;
}
