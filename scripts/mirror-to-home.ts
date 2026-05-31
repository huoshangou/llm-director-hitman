import * as fs from "node:fs";
import * as path from "node:path";
import { documentsRepoRoot, homeDevRoot, repoRootFromScript } from "./lib/paths";
import { mirrorRepo } from "./lib/mirror";

const src = fs.existsSync(documentsRepoRoot())
  ? documentsRepoRoot()
  : repoRootFromScript();
const dest = homeDevRoot();

if (!fs.existsSync(path.join(dest, "package.json"))) {
  console.error("~/hitman 不存在，请先: npm run setup:home");
  process.exit(1);
}

console.log(`${src} → ${dest}`);
const n = mirrorRepo(src, dest);
console.log(n ? `已更新 ${n} 个文件` : "无变更");
