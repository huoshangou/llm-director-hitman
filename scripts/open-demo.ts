import { execSync } from "node:child_process";
import { URL_MAIN, URL_PLAY } from "./lib/paths";
import { isServerHealthy, killPort, portPids, reuseExistingServer } from "./lib/port";

async function main() {
  if (!(await reuseExistingServer())) {
    if (portPids().length) killPort();
    console.error("演示未运行。请双击桌面「启动 Hitman 演示」");
    process.exit(1);
  }

  if (!(await isServerHealthy())) {
    console.error("服务无响应，请重新双击启动器");
    process.exit(1);
  }

  console.log(URL_MAIN);
  console.log(URL_PLAY);
  if (process.platform === "darwin") {
    execSync(`open "${URL_MAIN}"`, { stdio: "ignore" });
  }
}

main();
