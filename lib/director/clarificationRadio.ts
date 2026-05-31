import type { DirectorValidation } from "./validateDirectorPlan";
import type { DirectorPlan } from "./directorSchema";
import type { MapSelection } from "../ui/mapSelection";
import type { FieldAgentId, WorldState } from "../world/worldTypes";

export type ClarificationReason =
  | "plan_empty"
  | "plan_unparsed"
  | "no_executable_step"
  | "proximity_blocked"
  | "missing_target"
  | "feasibility_impossible";

export type FieldAgentRadioLine = {
  agent: FieldAgentId;
  text: string;
  tone: "blocked" | "suggestion" | "cautious";
};

const TEMPLATES: Record<ClarificationReason, FieldAgentRadioLine[]> = {
  plan_empty: [
    {
      agent: "face",
      text: "频道里只有你呼吸声。点一下地图上的目标或物件，再说这 turn 要干什么？",
      tone: "cautious",
    },
  ],
  plan_unparsed: [
    {
      agent: "face",
      text: "我没听懂这 turn 的具体动作。是改名单、引开保安、还是伪造短信？",
      tone: "blocked",
    },
    {
      agent: "runner",
      text: "要动配电、清洁车还是栏杆，你也得说清楚我才能动。",
      tone: "suggestion",
    },
  ],
  no_executable_step: [
    {
      agent: "face",
      text: "计划里这一步我接不了。你换种说法，或先点地图上的可操作目标？",
      tone: "blocked",
    },
  ],
  proximity_blocked: [
    {
      agent: "runner",
      text: "我不在那个区，过不去。你先让我换区，或换 Face 在大堂动手？",
      tone: "blocked",
    },
  ],
  missing_target: [
    {
      agent: "face",
      text: "目标是谁、在哪？点一下地图上的 Victor 或相关物件再说一遍。",
      tone: "cautious",
    },
  ],
  feasibility_impossible: [
    {
      agent: "face",
      text: "现在场面不允许硬来。要不要先铺垫 Belief，或换低调一点的步骤？",
      tone: "suggestion",
    },
  ],
};

export function deriveClarificationReason(input: {
  playerPlan: string;
  validation: DirectorValidation | null;
  stubMessage?: string;
}): ClarificationReason {
  const { playerPlan, validation, stubMessage } = input;
  if (!playerPlan.trim()) return "plan_empty";

  const rejected = validation?.rejected ?? [];
  const reasons = rejected.flatMap((r) => r.reasons.join(" ").toLowerCase());
  const blob = reasons.join(" ");
  if (blob.includes("proximity") || blob.includes("同区") || blob.includes("blocked")) {
    return "proximity_blocked";
  }
  if (blob.includes("target") || blob.includes("目标")) {
    return "missing_target";
  }

  if (stubMessage && /解析|无法|试试/.test(stubMessage)) return "plan_unparsed";
  if (validation?.executableChain.length === 0) return "no_executable_step";
  return "feasibility_impossible";
}

export function composeFieldAgentRadio(reason: ClarificationReason): FieldAgentRadioLine[] {
  return TEMPLATES[reason].map((l) => ({ ...l }));
}

/** 模板为主；LLM 若已产出 agentComms 则优先（方案 C） */
export async function buildFieldAgentRadio(input: {
  playerPlan: string;
  world: WorldState;
  selection: MapSelection | null;
  plan: DirectorPlan | null;
  validation: DirectorValidation | null;
  stubMessage?: string;
}): Promise<FieldAgentRadioLine[]> {
  const reason = deriveClarificationReason({
    playerPlan: input.playerPlan,
    validation: input.validation,
    stubMessage: input.stubMessage,
  });
  const base = composeFieldAgentRadio(reason);

  const fromPlan = (input.plan?.agentComms ?? [])
    .filter((c) => c.agent === "face" || c.agent === "runner")
    .map((c) => ({
      agent: c.agent as FieldAgentId,
      text: c.text,
      tone: (c.tone === "blocked" || c.tone === "suggestion" || c.tone === "cautious"
        ? c.tone
        : "cautious") as FieldAgentRadioLine["tone"],
    }));

  if (fromPlan.length > 0) {
    return fromPlan;
  }
  return base;
}
