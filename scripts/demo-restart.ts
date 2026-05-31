/** 清端口并启动（白屏/僵死时用） */
import { killPort } from "./lib/port";

killPort();
console.log("已清理 8747。请双击桌面「启动 Hitman 演示」重新启动。");
