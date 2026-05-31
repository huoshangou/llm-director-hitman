/** Mission Brief overlay — 固定开局说明，非 LLM 生成（ADR-0018） */

const MISSION_BRIEF_SESSION_KEY = "play_mission_brief_dismissed";

const MISSION_BRIEF_FALLBACK = [
  "地点：美术馆晚宴 · Victor 在画廊—阳台一线活动",
  "你：远程 Hacker；Face 社交引开；Runner 吧台酒具、配电与栏杆",
  "目标：Victor Vale（维克多·韦尔）须在阳台倒下，像意外",
  "关键时机：他只在阳台私密赏画时单独接一杯酒",
  "缺口：人未到阳台 / 栏杆未动 / 视线未清 → 点地图骇入分析后发指令",
  "第一步：选中实体看分析，再写一句自然语言指令发送",
];

function missionBriefLines() {
  if (typeof HitmanCore !== "undefined" && Array.isArray(HitmanCore.MISSION_BRIEF_LINES)) {
    return HitmanCore.MISSION_BRIEF_LINES;
  }
  return MISSION_BRIEF_FALLBACK;
}

function missionBriefDismissed() {
  try {
    return window.sessionStorage?.getItem(MISSION_BRIEF_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function setMissionBriefDismissed() {
  try {
    window.sessionStorage?.setItem(MISSION_BRIEF_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

function shouldAutoShowMissionBrief() {
  const params = new URLSearchParams(window.location.search);
  const brief = params.get("brief");
  if (brief === "0") return false;
  if (brief === "1") return true;
  return !missionBriefDismissed();
}

function setMissionBriefVisible(visible) {
  const overlay = document.getElementById("mission-brief-overlay");
  if (!overlay) return;
  overlay.hidden = !visible;
  overlay.setAttribute("aria-hidden", visible ? "false" : "true");
}

function dismissMissionBrief(persistSession = true) {
  if (persistSession) setMissionBriefDismissed();
  setMissionBriefVisible(false);
}

function openMissionBrief() {
  setMissionBriefVisible(true);
}

function initMissionBrief() {
  const overlay = document.getElementById("mission-brief-overlay");
  const body = document.getElementById("mission-brief-body");
  if (!overlay || !body) return;

  body.innerHTML = missionBriefLines().map((line) => `<p>${escapePlanHtml(line)}</p>`).join("");

  document.getElementById("btn-mission-brief-start")?.addEventListener("click", () => {
    dismissMissionBrief(true);
  });
  document.getElementById("btn-mission-brief-close")?.addEventListener("click", () => {
    dismissMissionBrief(true);
  });
  document.getElementById("btn-mission-brief-top")?.addEventListener("click", () => {
    openMissionBrief();
  });

  if (shouldAutoShowMissionBrief()) {
    setMissionBriefVisible(true);
  } else {
    setMissionBriefVisible(false);
  }
}

window.initMissionBrief = initMissionBrief;
window.openMissionBrief = openMissionBrief;
window.dismissMissionBrief = dismissMissionBrief;
