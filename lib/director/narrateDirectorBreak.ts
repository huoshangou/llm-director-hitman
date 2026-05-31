import type { DirectorBreak } from "./directorBreak";
import type { FieldAgentRadioLine } from "./clarificationRadio";
import type { WorldState } from "../world/worldTypes";

const BREAK_RADIO: Record<DirectorBreak["code"], FieldAgentRadioLine[]> = {
  NO_TOOL_MATCH: [
    { agent: "face", text: "这句我接不上具体动作。点地图目标，或说清楚：进画廊、引保安、改名单？", tone: "blocked" },
  ],
  ALL_BLOCKED: [
    { agent: "runner", text: "计划对上了，但我这边前置条件不满足，动不了。", tone: "blocked" },
    { agent: "face", text: "我这边也一样。要不要先换区或换更低风险的步骤？", tone: "suggestion" },
  ],
  SEMANTIC_MISMATCH: [
    { agent: "face", text: "你要的是进画廊见人，不是在大堂喊一嗓子。保安没走开前我也进不去。", tone: "blocked" },
  ],
  DEPENDENCY_UNMET: [
    { agent: "face", text: "画廊入口还被盯着。先引开保安或断电，再让我混进去。", tone: "blocked" },
  ],
  UNSUPPORTED_INTENT: [
    { agent: "runner", text: "这一步没有对应工具，硬做只会乱套。", tone: "blocked" },
    { agent: "face", text: "我这边也接不了。换可执行的说法或先铺垫。", tone: "suggestion" },
  ],
  CLARIFICATION_NEEDED: [
    { agent: "face", text: "再说具体一点：谁、在哪、要什么结果？", tone: "cautious" },
  ],
  EXECUTION_HALTED: [
    { agent: "face", text: "场面失控，本 turn 中止。", tone: "blocked" },
  ],
};

function isViolenceBreak(breakInfo: DirectorBreak): boolean {
  const blob = `${breakInfo.detail} ${breakInfo.playerMessage}`;
  return /violence|杀|kill|assassin|致命手段/i.test(blob);
}

export function radioForDirectorBreak(breakInfo: DirectorBreak): FieldAgentRadioLine[] {
  if (breakInfo.code === "UNSUPPORTED_INTENT" && isViolenceBreak(breakInfo)) {
    return [
      { agent: "runner", text: "别想了，没有干净致命手段，硬上会直接暴露。", tone: "blocked" },
      {
        agent: "face",
        text: "要制服保安换装？我们没准备这类工具。换社交或事故路线。",
        tone: "suggestion",
      },
    ];
  }

  const base = BREAK_RADIO[breakInfo.code] ?? BREAK_RADIO.CLARIFICATION_NEEDED;
  const usePlayerMsg = ["SEMANTIC_MISMATCH", "UNSUPPORTED_INTENT", "DEPENDENCY_UNMET"].includes(
    breakInfo.code,
  );
  return base.map((line) => ({
    ...line,
    text: usePlayerMsg ? breakInfo.playerMessage : line.text,
  }));
}

export async function buildBreakRadio(input: {
  break: DirectorBreak;
  playerPlan: string;
  world: WorldState;
}): Promise<FieldAgentRadioLine[]> {
  void input.playerPlan;
  void input.world;
  return radioForDirectorBreak(input.break);
}
