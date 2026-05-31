import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export const PORT = 8747;
export const HOST = "127.0.0.1";
export const URL_MAIN = `http://${HOST}:${PORT}/`;
export const URL_PLAY = `http://${HOST}:${PORT}/play/index.html`;

export function repoRootFromScript(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../..");
}

export function homeDevRoot(): string {
  return path.join(os.homedir(), "hitman");
}

export function documentsRepoRoot(): string {
  return path.join(os.homedir(), "Documents", "llm_director_hitman");
}

export function resolvePlayRoot(): string {
  const env = process.env.HITMAN_ROOT;
  if (env && fs.existsSync(env)) return path.resolve(env);
  const home = homeDevRoot();
  if (fs.existsSync(path.join(home, "package.json"))) return home;
  return process.cwd();
}
