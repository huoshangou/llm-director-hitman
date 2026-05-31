/** Mission Frame copy — single source for Brief, feed, tests (ADR-0018). */

export const MISSION_TARGET_NAME = "Victor Vale（维克多·韦尔）";

export const MISSION_OPS_LINE = `MISSION / ${MISSION_TARGET_NAME} · 阳台意外收场 · Face 引开与邀约 · Runner 吧台酒具/栏杆/配电`;

export const MISSION_BRIEF_LINES: string[] = [
  "地点：美术馆晚宴 · Victor 在画廊—阳台一线活动",
  "你：远程 Hacker；Face 社交引开；Runner 吧台酒具、配电与栏杆",
  `目标：${MISSION_TARGET_NAME} 须在阳台倒下，像意外（雇主合同要阳台场面）`,
  "关键时机：他只在阳台私密赏画时单独接一杯酒",
  "缺口：人未到阳台 / 栏杆未动 / 视线未清 → 点地图骇入分析后发指令",
  "第一步：选中实体看分析，再写一句自然语言指令发送",
];
